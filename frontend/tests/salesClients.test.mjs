import test from 'node:test';
import assert from 'node:assert/strict';
import { clientesService } from '../src/services/clientesService.ts';
import { persistSalesOrder } from '../src/modules/ventas/salesOrder.ts';
import { salesClientSnapshot } from '../src/modules/ventas/salesClient.ts';
import { emitLocalInvoice, buildInvoice } from '../src/services/billing.ts';
class Store {
 values = new Map(); fail = null;
 getItem(k) {return this.values.get(k) ?? null;}
 setItem(k,v) {if(this.fail?.(k,v)) throw Error('failure');this.values.set(k,v);}
 removeItem(k) {this.values.delete(k);}
}
const form={tipo_persona:'JURIDICA',documento:'20512345678',nombre:'Cliente registrado',direccion:'Direccion original',email:'',telefono:'',limite_credito:0};
const client={...form,id:'C1',estado:'Activo',historial:[]};
const lines=[{id:'L1',codigo:'P1',descripcion:'Producto',cantidad:2,precioVenta:50,importe:100}];
const issuer={ruc:'20598765432',legalName:'Emisor configurado',fiscalAddress:'Direccion declarada'};
function setup(){const s=new Store();s.setItem('erp_products_db',JSON.stringify([{id:'P1',codigo:'P1',descripcion:'Producto',stock:10,costoUnitario:5}]));return s;}
test('catalogo vacio no crea ejemplos; registros previos se preservan y corrupcion no se reemplaza',async()=>{
 const s=new Store();globalThis.localStorage=s;
 assert.deepEqual(await clientesService.getClientes(),[]);assert.equal(s.values.size,0);
 const original=JSON.stringify([{...client,nombre:'Ejemplo previo',unknown:42}]);s.setItem('erp_enterprise_clientes',original);
 assert.equal((await clientesService.getClientes())[0].unknown,42);assert.equal(s.getItem('erp_enterprise_clientes'),original);
 s.setItem('erp_enterprise_clientes','invalid');await assert.rejects(clientesService.getClientes());assert.equal(s.getItem('erp_enterprise_clientes'),'invalid');
});
test('crear, seleccionar, editar y emitir conserva snapshots y stock; no enlaza por nombre',async()=>{
 const s=setup();globalThis.localStorage=s;
 const created=await clientesService.createCliente(form);
 const selected=(await clientesService.getClientes()).find(c=>c.id===created.id);
 const order=persistSalesOrder(s,'OV1',selected,lines,'real@example.test');
 await clientesService.updateCliente(created.id,{...form,nombre:'Nombre editado',documento:'20612345678',direccion:'Direccion editada'});
 assert.deepEqual(JSON.parse(s.getItem('erp_ordenes_venta'))[0].cliente_datos,order.cliente_datos);
 assert.equal(order.cliente_id,created.id);assert.equal(order.cliente_datos.nombre,form.nombre);
 const stock=s.getItem('erp_products_db'),moves=s.getItem('erp_kardex_movimientos');
 const invoice=emitLocalInvoice(s,'OV1',issuer,'real@example.test','I1');
 assert.deepEqual(invoice.cliente_datos,order.cliente_datos);assert.equal(invoice.cliente_datos.direccion,form.direccion);
 await clientesService.updateCliente(created.id,{...form,nombre:'Otro cambio'});
 assert.deepEqual(JSON.parse(s.getItem('erp_estado_cuenta'))[0].cliente_datos,order.cliente_datos);
 assert.equal(s.getItem('erp_products_db'),stock);assert.equal(s.getItem('erp_kardex_movimientos'),moves);
 assert.ok([...s.values.keys()].some(k=>k.startsWith('erp_respaldo_clientes_')));
});
test('datos incompletos no inventan valores; errores de identidad no alteran stock',()=>{
 const s=setup(),before=s.getItem('erp_products_db');
 for(const bad of [{...client,nombre:''},{...client,documento:''},{...client,estado:'Inactivo'},null]) assert.throws(()=>persistSalesOrder(s,'OV1',bad,lines,''));
 assert.equal(s.getItem('erp_products_db'),before);assert.equal(s.getItem('erp_ordenes_venta'),null);
 const order=persistSalesOrder(s,'OV2',{...client,direccion:'',email:'',telefono:''},lines,'');
 assert.equal(order.cliente_datos.direccion,null);assert.equal(order.cliente_datos.email,null);
 assert.equal(buildInvoice(order,issuer,'','I1','LOC-1').cliente_datos.direccion,null);
 assert.throws(()=>salesClientSnapshot({...client,tipo_persona:'invalid'}));
});
test('reintento conserva una orden y una salida; distinta solicitud no reutiliza ID',()=>{
 const s=setup();persistSalesOrder(s,'OV1',client,lines,'');
 const before=s.getItem('erp_products_db');persistSalesOrder(s,'OV1',client,lines,'');
 assert.equal(JSON.parse(s.getItem('erp_ordenes_venta')).length,1);assert.equal(JSON.parse(s.getItem('erp_kardex_movimientos')).length,1);
 assert.equal(s.getItem('erp_products_db'),before);assert.equal(JSON.parse(before)[0].stock,8);
 assert.throws(()=>persistSalesOrder(s,'OV1',{...client,nombre:'Cambio'},lines,''));
});
test('fallo de guardado restaura orden, stock y movimientos; reintento seguro',()=>{
 const s=setup(),before=s.getItem('erp_products_db');let failed=false;
 s.fail=k=>k==='erp_ordenes_venta'&&!failed?(failed=true):false;
 assert.throws(()=>persistSalesOrder(s,'OV1',client,lines,''));
 assert.equal(s.getItem('erp_products_db'),before);assert.equal(s.getItem('erp_kardex_movimientos'),null);assert.equal(s.getItem('erp_ordenes_venta'),null);
 persistSalesOrder(s,'OV1',client,lines,'');assert.equal(JSON.parse(s.getItem('erp_products_db'))[0].stock,8);
});
test('operacion antigua mantiene identidad propia sin lookup por coincidencia de nombre',()=>{
 const old={id:'OLD',cliente:form.nombre,ruc:'20123456789',total:118,items:[{desc:'Producto',cant:2,pUnitario:50,total:100}]};
 const copy=JSON.stringify(old);const invoice=buildInvoice(old,issuer,'','I1','LOC-1');
 assert.equal(invoice.cliente_datos.documento,'20123456789');assert.equal(invoice.cliente_datos.id,undefined);assert.equal(JSON.stringify(old),copy);
 assert.throws(()=>buildInvoice({...old,ruc:''},issuer,'','I2','LOC-2'));
});
