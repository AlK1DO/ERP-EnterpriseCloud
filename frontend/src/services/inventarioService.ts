export interface Producto {
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
    const data = localStorage.getItem(LOCAL_STORAGE_PRODUCTS);
    let rawList: any[] = [];
    if (!data) {
      rawList = PRODUCTOS_BASE;
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS, JSON.stringify(PRODUCTOS_BASE));
    } else {
      try {
        rawList = JSON.parse(data);
        if (!Array.isArray(rawList)) rawList = PRODUCTOS_BASE;
      } catch (e) {
        rawList = PRODUCTOS_BASE;
      }
    }

    // Normalizar datos legacy de versiones previas
    const normalizados: Producto[] = rawList.map((p, idx) => {
      const baseMatch = PRODUCTOS_BASE.find(b => b.codigo === p.codigo);
      const precioVenta = Number(p.precioVenta) || (baseMatch?.precioVenta ?? 100);
      const costoUnitario = p.costoUnitario !== undefined 
        ? Number(p.costoUnitario) 
        : (baseMatch?.costoUnitario ?? Number((precioVenta * 0.75).toFixed(2)));

      return {
        id: p.id || `prod-${idx + 1}`,
        codigo: p.codigo || `PROD-${idx + 1}`,
        descripcion: p.descripcion || 'Producto sin descripción',
        categoria: p.categoria || (baseMatch?.categoria ?? 'General'),
        unidad: p.unidad || (baseMatch?.unidad ?? 'NIU'),
        costoUnitario: isNaN(costoUnitario) ? 0 : costoUnitario,
        precioVenta: isNaN(precioVenta) ? 0 : precioVenta,
        stock: Number(p.stock) || 0,
        stockMinimo: Number(p.stockMinimo) || (baseMatch?.stockMinimo ?? 5),
        almacen: p.almacen || (baseMatch?.almacen ?? 'Almacén Central')
      };
    });

    localStorage.setItem(LOCAL_STORAGE_PRODUCTS, JSON.stringify(normalizados));
    return normalizados;
  },

  saveProductos: (productos: Producto[]) => {
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS, JSON.stringify(productos));
  },

  createProducto: async (data: Omit<Producto, 'id' | 'stock'> & { stockInicial?: number }): Promise<Producto> => {
    const productos = await inventarioService.getProductos();
    const id = 'prod-' + Date.now();
    const stock = Number(data.stockInicial || 0);

    const nuevo: Producto = {
      id,
      codigo: data.codigo.trim().toUpperCase(),
      descripcion: data.descripcion.trim(),
      categoria: data.categoria || 'General',
      unidad: data.unidad || 'NIU',
      costoUnitario: Number(data.costoUnitario) || 0,
      precioVenta: Number(data.precioVenta) || 0,
      stock,
      stockMinimo: Number(data.stockMinimo) || 0,
      almacen: data.almacen || 'Almacén Central'
    };

    productos.push(nuevo);
    inventarioService.saveProductos(productos);

    if (stock > 0) {
      await inventarioService.registrarMovimiento({
        productoId: nuevo.id,
        productoCodigo: nuevo.codigo,
        productoDescripcion: nuevo.descripcion,
        tipoMovimiento: 'ENTRADA',
        tipoOperacion: 'INGRESO_AJUSTE',
        documentoTipo: 'INVENTARIO INICIAL',
        documentoNumero: 'INV-INI',
        detalle: 'Inventario inicial al crear producto',
        almacen: nuevo.almacen,
        cantidad: stock,
        costoUnitario: nuevo.costoUnitario
      });
    }

    return nuevo;
  },

  updateProducto: async (id: string, data: Partial<Producto>): Promise<Producto> => {
    const productos = await inventarioService.getProductos();
    const idx = productos.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Producto no encontrado');

    productos[idx] = { ...productos[idx], ...data };
    inventarioService.saveProductos(productos);
    return productos[idx];
  },

  deleteProducto: async (id: string): Promise<void> => {
    let productos = await inventarioService.getProductos();
    productos = productos.filter(p => p.id !== id);
    inventarioService.saveProductos(productos);
  },

  getMovimientos: async (): Promise<MovimientoKardex[]> => {
    const data = localStorage.getItem(LOCAL_STORAGE_KARDEX);
    if (!data) return [];
    return JSON.parse(data);
  },

  saveMovimientos: (movimientos: MovimientoKardex[]) => {
    localStorage.setItem(LOCAL_STORAGE_KARDEX, JSON.stringify(movimientos));
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
    const productos = await inventarioService.getProductos();
    const producto = productos.find(p => p.id === params.productoId || p.codigo === params.productoCodigo);
    if (!producto) throw new Error('Producto no existe para kardex');

    const movimientos = await inventarioService.getMovimientos();
    const cantidad = Number(params.cantidad);
    const costo = Number(params.costoUnitario);

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

    producto.stock = nuevoStock;
    producto.costoUnitario = nuevoCostoPromedio;
    inventarioService.saveProductos(productos);

    movimientos.unshift(movimiento);
    inventarioService.saveMovimientos(movimientos);

    return movimiento;
  }
};
