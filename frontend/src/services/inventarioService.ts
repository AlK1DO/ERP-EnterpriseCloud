import { assertInventoryReady, commitInventoryTransaction, withInventoryLock } from './inventoryTransaction.ts';
import { assertBillingReady } from './billingTransaction.ts';
import { validateProduct, assertProductDeletable } from './productCatalog.ts';

export interface Producto {
  codigosAnteriores?: string[];
  descripcionesAnteriores?: string[];
  id: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  unidad: string;
  costoUnitario: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  almacen: string;
}

export interface MovimientoKardex {
  recepcion_id?: string;
  orden_id?: string | null;
  id: string;
  fecha: string;
  productoId: string;
  productoCodigo: string;
  productoDescripcion: string;
  tipoMovimiento: 'ENTRADA' | 'SALIDA';
  tipoOperacion: 'COMPRA' | 'VENTA' | 'INGRESO_AJUSTE' | 'SALIDA_AJUSTE' | 'DEVOLUCION';
  documentoTipo: string;
  documentoNumero: string;
  detalle: string;
  almacen: string;
  // Entradas
  cantEntrada?: number;
  costoEntrada?: number;
  totalEntrada?: number;
  // Salidas
  cantSalida?: number;
  costoSalida?: number;
  totalSalida?: number;
  // Saldos
  saldoCantidad: number;
  saldoCostoUnitario: number;
  saldoTotal: number;
}

const LOCAL_STORAGE_PRODUCTS = 'erp_products_db';
const LOCAL_STORAGE_KARDEX = 'erp_kardex_movimientos';

const PRODUCTOS_BASE: Producto[] = [
  {
    id: 'prod-1',
    codigo: 'LAP-HP450',
    descripcion: 'Laptop HP ProBook 450 G8 15.6"',
    categoria: 'Laptops',
    unidad: 'NIU',
    costoUnitario: 3200.00,
    precioVenta: 4200.00,
    stock: 15,
    stockMinimo: 5,
    almacen: 'Almacén Central'
  },
  {
    id: 'prod-2',
    codigo: 'MON-DELL27',
    descripcion: 'Monitor Dell UltraSharp 27 4K',
    categoria: 'Monitores',
    unidad: 'NIU',
    costoUnitario: 1400.00,
    precioVenta: 1850.00,
    stock: 20,
    stockMinimo: 8,
    almacen: 'Almacén Central'
  },
  {
    id: 'prod-3',
    codigo: 'TEC-MXM',
    descripcion: 'Teclado Mecánico Logitech MX',
    categoria: 'Periféricos',
    unidad: 'NIU',
    costoUnitario: 310.00,
    precioVenta: 450.00,
    stock: 25,
    stockMinimo: 10,
    almacen: 'Almacén Central'
  }
];

export const inventarioService = {
  getProductos: async (): Promise<Producto[]> => {
    assertInventoryReady(localStorage);
    const data = localStorage.getItem(LOCAL_STORAGE_PRODUCTS);
    if (data === null) {
      commitInventoryTransaction(localStorage, { [LOCAL_STORAGE_PRODUCTS]: JSON.stringify(PRODUCTOS_BASE) }, 'catalogo-inicial');
      return JSON.parse(JSON.stringify(PRODUCTOS_BASE));
    }
    const products = JSON.parse(data);
    if (!Array.isArray(products) || products.some(p => !p || typeof p !== 'object' || Array.isArray(p))) throw new Error('Catalogo invalido; se conservaron los datos originales.');
    // Lectura sin normalizar ni reconstruir saldos desde un Kardex incompleto.
    return products;
  },

  createProducto: async (data: Omit<Producto, 'id' | 'stock'> & { stockInicial?: number }): Promise<Producto> => {
    return withInventoryLock(async () => {
      assertBillingReady(localStorage);
      if ((data.stockInicial !== undefined && data.stockInicial !== 0) || data.costoUnitario !== 0) throw new Error('El producto nuevo inicia con stock y costo cero. Registra la entrada en Ingreso al Kardex.');
      const productos = await inventarioService.getProductos();
      const nuevo: Producto = { ...data, id: crypto.randomUUID(), codigo: data.codigo.trim().toUpperCase(), descripcion: data.descripcion.trim(), stock: 0, costoUnitario: 0 };
      delete (nuevo as Producto & {stockInicial?: number}).stockInicial;
      validateProduct(nuevo, productos);
      commitInventoryTransaction(localStorage, { [LOCAL_STORAGE_PRODUCTS]: JSON.stringify([...productos, nuevo]) }, nuevo.id);
      return nuevo;
    });
  },
  updateProducto: async (id: string, data: Partial<Producto>): Promise<Producto> => withInventoryLock(async () => {
    assertBillingReady(localStorage);
    if (['stock','costoUnitario','id'].some(key => Object.prototype.hasOwnProperty.call(data,key))) throw new Error('Stock y costo promedio solo cambian mediante movimientos registrados; el ID es inmutable.');
    const productos = await inventarioService.getProductos();
    const index = productos.findIndex(p => p.id === id);
    if (index < 0) throw new Error('Producto no encontrado');
    const allowed = ['codigo','descripcion','categoria','precioVenta','stockMinimo','unidad','almacen'];
    if (Object.keys(data).some(key => !allowed.includes(key))) throw new Error('Campo de producto no editable.');
    const updated = { ...productos[index], ...data };
    updated.codigo = updated.codigo.trim().toUpperCase(); updated.descripcion = updated.descripcion.trim();
    validateProduct(updated, productos);
    updated.codigosAnteriores = [...new Set([...(productos[index].codigosAnteriores ?? []), productos[index].codigo])];
    updated.descripcionesAnteriores = [...new Set([...(productos[index].descripcionesAnteriores ?? []), productos[index].descripcion])];
    productos[index] = updated;
    commitInventoryTransaction(localStorage, { [LOCAL_STORAGE_PRODUCTS]: JSON.stringify(productos) }, id);
    return updated;
  }),
  deleteProducto: async (id: string): Promise<void> => withInventoryLock(async () => {
    assertBillingReady(localStorage);
    const productos = await inventarioService.getProductos();
    const product = productos.find(p => p.id === id);
    if (!product) throw new Error('Producto no encontrado');
    assertProductDeletable(localStorage, product);
    commitInventoryTransaction(localStorage, { [LOCAL_STORAGE_PRODUCTS]: JSON.stringify(productos.filter(p => p.id !== id)) }, id);
  }),

  getMovimientos: async (): Promise<MovimientoKardex[]> => {
    assertInventoryReady(localStorage);
    const data = localStorage.getItem(LOCAL_STORAGE_KARDEX);
    if (!data) return [];
    const movements = JSON.parse(data);
    if (!Array.isArray(movements) || movements.some(m => !m || typeof m !== 'object')) throw new Error('Historial invalido; no se reemplazaron movimientos.');
    return movements;
  },

  registrarMovimiento: async (params: {
    productoId: string;
    productoCodigo: string;
    productoDescripcion: string;
    tipoMovimiento: 'ENTRADA' | 'SALIDA';
    tipoOperacion: 'COMPRA' | 'VENTA' | 'INGRESO_AJUSTE' | 'SALIDA_AJUSTE' | 'DEVOLUCION';
    documentoTipo: string;
    documentoNumero: string;
    detalle: string;
    almacen: string;
    cantidad: number;
    costoUnitario: number;
  }): Promise<MovimientoKardex> => {
    return withInventoryLock(async () => {
    assertBillingReady(localStorage);
    const productos = await inventarioService.getProductos();
    const matches = productos.filter(p => params.productoId ? p.id === params.productoId : p.codigo === params.productoCodigo);
    const producto = matches.length === 1 ? matches[0] : undefined;
    if (!producto) throw new Error('Producto no existe para kardex');

    const movimientos = await inventarioService.getMovimientos();
    const cantidad = Number(params.cantidad);
    const costo = Number(params.costoUnitario);

    if (!Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(costo) || costo < 0 || !['ENTRADA','SALIDA'].includes(params.tipoMovimiento)) throw new Error('Cantidad, costo o movimiento invalido.');
    if (![producto.stock, producto.costoUnitario].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0)) throw new Error('Saldo previo inconsistente; requiere revision sin correccion automatica.');
    let nuevoStock = producto.stock;
    let nuevoCostoPromedio = producto.costoUnitario;

    let movimiento: MovimientoKardex;

    const fechaStr = new Date().toISOString();

    if (params.tipoMovimiento === 'ENTRADA') {
      const valorActual = producto.stock * producto.costoUnitario;
      const valorEntrada = cantidad * costo;
      nuevoStock = producto.stock + cantidad;
      nuevoCostoPromedio = nuevoStock > 0 ? (valorActual + valorEntrada) / nuevoStock : costo;

      movimiento = {
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        fecha: fechaStr,
        productoId: producto.id,
        productoCodigo: producto.codigo,
        productoDescripcion: producto.descripcion,
        tipoMovimiento: 'ENTRADA',
        tipoOperacion: params.tipoOperacion,
        documentoTipo: params.documentoTipo,
        documentoNumero: params.documentoNumero,
        detalle: params.detalle,
        almacen: params.almacen || producto.almacen,
        cantEntrada: cantidad,
        costoEntrada: costo,
        totalEntrada: cantidad * costo,
        saldoCantidad: nuevoStock,
        saldoCostoUnitario: nuevoCostoPromedio,
        saldoTotal: nuevoStock * nuevoCostoPromedio
      };
    } else {
      if (producto.stock < cantidad) {
        throw new Error(`Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${cantidad}`);
      }
      nuevoStock = producto.stock - cantidad;
      movimiento = {
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        fecha: fechaStr,
        productoId: producto.id,
        productoCodigo: producto.codigo,
        productoDescripcion: producto.descripcion,
        tipoMovimiento: 'SALIDA',
        tipoOperacion: params.tipoOperacion,
        documentoTipo: params.documentoTipo,
        documentoNumero: params.documentoNumero,
        detalle: params.detalle,
        almacen: params.almacen || producto.almacen,
        cantSalida: cantidad,
        costoSalida: producto.costoUnitario,
        totalSalida: cantidad * producto.costoUnitario,
        saldoCantidad: nuevoStock,
        saldoCostoUnitario: producto.costoUnitario,
        saldoTotal: nuevoStock * producto.costoUnitario
      };
    }

    if (![nuevoStock, nuevoCostoPromedio, nuevoStock * nuevoCostoPromedio].every(Number.isFinite)) throw new Error('El movimiento excede el rango numerico permitido.');
    producto.stock = nuevoStock;
    producto.costoUnitario = nuevoCostoPromedio;
    movimientos.unshift(movimiento);
    commitInventoryTransaction(localStorage, { [LOCAL_STORAGE_PRODUCTS]: JSON.stringify(productos), [LOCAL_STORAGE_KARDEX]: JSON.stringify(movimientos) }, movimiento.id);

    return movimiento;
    });
  }
};
