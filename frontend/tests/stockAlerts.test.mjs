import test from 'node:test';
import assert from 'node:assert/strict';
import { inventarioService as inventory } from '../src/services/inventarioService.ts';
import { stockState, stockSummary } from '../src/services/stockAlerts.ts';
import { computeDashboard } from '../src/modules/dashboard/dashboardAnalytics.ts';
import { persistReception, orderReceiptItems } from '../src/services/receptionService.ts';
import { persistSalesOrder } from '../src/modules/ventas/salesOrder.ts';
class Store {
 values=new Map(); fail=null; writes=[];
 getItem(k){return this.values.get(k)??null;}
 setItem(k,v){if(this.fail?.(k,v))throw Error('failure');this.values.set(k,v);this.writes.push(k);}
 removeItem(k){this.values.delete(k);}
}
const base={id:'P1',codigo:'SKU1',descripcion:'Producto',categoria:'Equipo',unidad:'NIU',almacen:'Central',stock:10,costoUnitario:5,precioVenta:10,stockMinimo:5};
function setup(product=base){const s=new Store();s.setItem('erp_products_db',JSON.stringify([product]));globalThis.localStorage=s;return s;}
function movement(type,qty,cost=5){return inventory.registrarMovimiento({productoId:'P1',productoCodigo:'SKU1',productoDescripcion:'Producto',tipoMovimiento:type,tipoOperacion:type==='ENTRADA'?'INGRESO_AJUSTE':'SALIDA_AJUSTE',documentoTipo:'NOTA',documentoNumero:'DOC1',detalle:'Ajuste declarado',almacen:'Central',cantidad:qty,costoUnitario:cost});}
function dashboard(products){return computeDashboard([],[],[],products,[],'monthly','2026-10-14','PEN');}
test('edicion directa de saldo/costo/ID rechazada; descriptivos y minimo validos conservan saldo',async()=>{
 const s=setup(),before=s.getItem('erp_products_db');
 for(const data of [{stock:99},{stock:10},{costoUnitario:2},{id:'otro'},{stockMinimo:-1},{stockMinimo:NaN},{stockMinimo:'5'},{precioVenta:Infinity},{codigo:''},{categoria:''}])await assert.rejects(inventory.updateProducto('P1',data));
 assert.equal(s.getItem('erp_products_db'),before);
 const p=await inventory.updateProducto('P1',{codigo:'nuevo',descripcion:'Nuevo nombre',categoria:'Otra',precioVenta:20,stockMinimo:0});
 assert.equal(p.stock,10);assert.equal(p.costoUnitario,5);assert.equal(p.stockMinimo,0);assert.equal(p.codigo,'NUEVO');assert.deepEqual(p.codigosAnteriores,['SKU1']);
 assert.equal(s.getItem('erp_kardex_movimientos'),null);
});
test('nuevo producto empieza en cero sin movimiento; rechaza stock inicial positivo y costo manual',async()=>{
 const s=setup();const {id: _id,stock: _stock,...form}=base;
 await assert.rejects(inventory.createProducto({...form,stockInicial:2,costoUnitario:0}));
 await assert.rejects(inventory.createProducto({...form,stockInicial:0}));
 const p=await inventory.createProducto({...form,codigo:'NUEVO',stockInicial:0,costoUnitario:0});
 assert.equal(p.stock,0);assert.equal(p.costoUnitario,0);assert.equal(s.getItem('erp_kardex_movimientos'),null);
 assert.equal(JSON.parse(s.getItem('erp_products_db')).length,2);
 await assert.rejects(inventory.createProducto({...form,codigo:'NUEVO',costoUnitario:0}));
});
test('regla compartida: cero, igual al minimo, superior, negativo e invalido',()=>{
 const products=[{stock:0,stockMinimo:0},{stock:5,stockMinimo:5},{stock:6,stockMinimo:5},{stock:-1,stockMinimo:5},{stock:1,stockMinimo:-1},{stock:'abc',stockMinimo:0}];
 assert.deepEqual(products.map(stockState),['AGOTADO','BAJO','NORMAL','INCONSISTENTE','INCONSISTENTE','INCONSISTENTE']);
 assert.deepEqual(stockSummary(products),{critical:2,inconsistent:3});
 const data=dashboard(products);assert.equal(data.stockBajo,stockSummary(products).critical);assert.deepEqual(data.stockList.map(p=>p.state),products.map(stockState));
});
test('entrada y salida actualizan saldos, promedio y alertas; notifican solo tras commit',async()=>{
 const s=setup({...base,stock:0,costoUnitario:0});const events=new EventTarget();let count=0;
 events.addEventListener('erp-inventory-changed',()=>count++);globalThis.window=events;
 try {
 await movement('ENTRADA',5,8);let p=(await inventory.getProductos())[0];assert.equal(stockState(p),'BAJO');assert.equal(p.costoUnitario,8);
 await movement('ENTRADA',5,12);p=(await inventory.getProductos())[0];assert.equal(p.stock,10);assert.equal(p.costoUnitario,10);assert.equal(stockState(p),'NORMAL');
 await movement('SALIDA',10);p=(await inventory.getProductos())[0];assert.equal(stockState(p),'AGOTADO');assert.equal(p.costoUnitario,10);
 assert.equal(dashboard([p]).stockBajo,1);assert.equal(JSON.parse(s.getItem('erp_kardex_movimientos')).length,3);assert.equal(count,3);
 } finally {delete globalThis.window;}
});
test('no elimina productos con stock ni referencias por ID, codigo, descripcion o alias historico',async()=>{
 setup();await assert.rejects(inventory.deleteProducto('P1'),/existencias/);
 for(const [key,row]of [['erp_ordenes_compra',{items:[{producto_id:'P1'}]}],['erp_ordenes_venta',{items:[{codigo:'SKU1'}]}],['erp_estado_cuenta',{items:[{desc:'Producto'}]}],['erp_kardex_movimientos',{productoId:'P1'}]]){
 const s=setup({...base,stock:0});s.setItem(key,JSON.stringify([row]));await inventory.updateProducto('P1',{codigo:'CAMBIO',descripcion:'Nueva descripcion'});
 await assert.rejects(inventory.deleteProducto('P1'),/referenciado/);assert.equal(JSON.parse(s.getItem('erp_products_db')).length,1);
 }
 const s=setup({...base,stock:0});await inventory.deleteProducto('P1');assert.deepEqual(await inventory.getProductos(),[]);
 assert.ok(s.writes.some(k=>k.startsWith('erp_respaldo_recepcion_')));
});
test('lectura conserva 60 unidades iniciales y saldos negativos sin generar aperturas; JSON corrupto no reemplazado',async()=>{
 const s=new Store();globalThis.localStorage=s;const seeded=await inventory.getProductos();assert.equal(seeded.reduce((a,p)=>a+p.stock,0),60);assert.equal(s.getItem('erp_kardex_movimientos'),null);
 const before=s.getItem('erp_products_db'),writes=s.writes.length;await inventory.getProductos();assert.equal(s.getItem('erp_products_db'),before);assert.equal(s.writes.length,writes);
 s.setItem('erp_products_db',JSON.stringify([{...base,stock:-2,stockMinimo:0}]));const negative=s.getItem('erp_products_db');assert.equal(stockState((await inventory.getProductos())[0]),'INCONSISTENTE');assert.equal(s.getItem('erp_products_db'),negative);await assert.rejects(movement('ENTRADA',3));
 s.setItem('erp_products_db','invalid');await assert.rejects(inventory.getProductos());assert.equal(s.getItem('erp_products_db'),'invalid');
});
test('fallo de guardado revierte movimiento y saldos; fallo de respaldo bloquea edicion',async()=>{
 const s=setup(),before=s.getItem('erp_products_db');let failed=false;s.fail=k=>k==='erp_kardex_movimientos'&&!failed?(failed=true):false;
 await assert.rejects(movement('SALIDA',2));assert.equal(s.getItem('erp_products_db'),before);assert.equal(s.getItem('erp_kardex_movimientos'),null);
 s.fail=k=>k.startsWith('erp_respaldo_');await assert.rejects(inventory.updateProducto('P1',{stockMinimo:2}));assert.equal(s.getItem('erp_products_db'),before);
});
test('compras y ventas siguen actualizando saldos sin pasar por edicion manual; codigo antiguo recibe por alias',async()=>{
 const s=setup();await inventory.updateProducto('P1',{codigo:'RENOMBRADO'});
 const oldOrder={id:'OC1',estado:'Pendiente de ingreso al Kardex',items:[{codigo:'SKU1',descripcion:'Producto',cantidad:2,precioUnitario:10}]};
 s.setItem('erp_ordenes_compra',JSON.stringify([oldOrder]));const products=await inventory.getProductos();
 const items=orderReceiptItems(oldOrder,products,[],'Central');
 persistReception(s,{id:'R1',ordenId:'OC1',tipoOperacion:'COMPRA',documentoTipo:'GUIA',documentoNumero:'G1',almacen:'Central',observaciones:'',proveedorId:'',items});
 let p=(await inventory.getProductos())[0];assert.equal(p.stock,12);assert.equal(p.costoUnitario,70/12);
 const client={id:'C1',nombre:'Cliente',documento:'20512345678',tipo_persona:'JURIDICA',estado:'Activo'};
 persistSalesOrder(s,'OV1',client,[{id:'L1',codigo:p.codigo,descripcion:p.descripcion,cantidad:2,precioVenta:10,importe:20}],'');
 p=(await inventory.getProductos())[0];assert.equal(p.stock,10);assert.equal(p.costoUnitario,70/12);assert.equal(JSON.parse(s.getItem('erp_kardex_movimientos')).length,2);
});
test('movimientos invalidos no modifican saldos ni historial',async()=>{
 const s=setup(),before=s.getItem('erp_products_db');for(const qty of [0,-1,NaN,Infinity,11])await assert.rejects(movement('SALIDA',qty));
 await assert.rejects(movement('ENTRADA',1,-1));assert.equal(s.getItem('erp_products_db'),before);assert.equal(s.getItem('erp_kardex_movimientos'),null);
});
