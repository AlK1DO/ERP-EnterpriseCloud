export interface ProductoTech {
  id: string;
  codigo: string;
  descripcion: string;
  linea: string;
  marca: string;
  unidad: string; // UND, CAJA, PQT
  almacen: string;
  precioCompra: number;
  precioVenta: number;
  stock: number;
  stockMinimo: number;
  estado: 'Activo' | 'Inactivo';
}

export interface AlmacenTech {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'CENTRAL' | 'SECUNDARIO' | 'GARANTIA_RMA';
  direccion: string;
  responsable: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
}

export interface VendedorTech {
  id: string;
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  comisionPct: number;
  metaMensual: number;
  zona: string;
  estado: 'Activo' | 'Inactivo';
}

export interface TransportistaTech {
  id: string;
  ruc: string;
  razonSocial: string;
  vehiculoModelo: string;
  vehiculoPlaca: string;
  conductor: string;
  brevete: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
}

export interface FormaPagoTech {
  id: string;
  codigo: string;
  nombre: string;
  diasCredito: number;
  tipo: 'CONTADO' | 'CREDITO';
  estado: 'Activo' | 'Inactivo';
}

export interface MonedaTech {
  id: string;
  codigoIso: string;
  nombre: string;
  simbolo: string;
  tipoCompra: number;
  tipoVenta: number;
  esBase: boolean;
}

export interface ListaPrecioTech {
  id: string;
  codigo: string;
  nombre: string;
  ajustePct: number;
  descripcion: string;
  estado: 'Activo' | 'Inactivo';
}

const STORAGE_KEY = 'erp_maestros_tech_data_v2';

const INITIAL_DATA = {
  productos: [
    { id: 'p1', codigo: 'MON-DELL27', descripcion: 'Monitor Dell UltraSharp 27" 4K IPS', linea: 'Monitores', marca: 'Dell', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 1350.00, precioVenta: 1850.00, stock: 15, stockMinimo: 5, estado: 'Activo' },
    { id: 'p2', codigo: 'MON-ASUS24', descripcion: 'Monitor Gamer Asus TUF 24" 165Hz FHD', linea: 'Monitores', marca: 'Asus', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 620.00, precioVenta: 850.00, stock: 20, stockMinimo: 5, estado: 'Activo' },
    { id: 'p3', codigo: 'LAP-HP450', descripcion: 'Laptop HP ProBook 450 G9 Core i7 16GB 512GB SSD', linea: 'Laptops', marca: 'HP', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 2950.00, precioVenta: 3750.00, stock: 10, stockMinimo: 3, estado: 'Activo' },
    { id: 'p4', codigo: 'LAP-ASUS35', descripcion: 'Laptop ASUS TUF Gaming F15 Core i7 16GB RTX', linea: 'Laptops', marca: 'Asus', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 3000.00, precioVenta: 3850.00, stock: 12, stockMinimo: 3, estado: 'Activo' },
    { id: 'p5', codigo: 'TEC-LOGIMX', descripcion: 'Teclado Mecánico Logitech MX Mechanical Wireless', linea: 'Teclados', marca: 'Logitech', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 380.00, precioVenta: 520.00, stock: 30, stockMinimo: 8, estado: 'Activo' },
    { id: 'p6', codigo: 'TEC-REDRAG', descripcion: 'Teclado Mecánico Redragon Kumara K552 RGB', linea: 'Teclados', marca: 'Redragon', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 110.00, precioVenta: 165.00, stock: 45, stockMinimo: 10, estado: 'Activo' },
    { id: 'p7', codigo: 'MOU-G502', descripcion: 'Mouse Gamer Logitech G502 HERO 25K Sensor', linea: 'Mouses', marca: 'Logitech', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 145.00, precioVenta: 210.00, stock: 35, stockMinimo: 10, estado: 'Activo' },
    { id: 'p8', codigo: 'MOU-MXM3S', descripcion: 'Mouse Inalámbrico Logitech MX Master 3S', linea: 'Mouses', marca: 'Logitech', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 290.00, precioVenta: 399.00, stock: 18, stockMinimo: 5, estado: 'Activo' },
    { id: 'p9', codigo: 'SSD-KING1TB', descripcion: 'Disco Sólido Kingston NV2 1TB PCIe 4.0 NVMe M.2', linea: 'Almacenamiento', marca: 'Kingston', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 195.00, precioVenta: 275.00, stock: 50, stockMinimo: 15, estado: 'Activo' },
    { id: 'p10', codigo: 'RAM-CORS16', descripcion: 'Memoria RAM Corsair Vengeance LPX 16GB DDR4 3200MHz', linea: 'Memorias RAM', marca: 'Corsair', unidad: 'UND', almacen: 'Almacén Central', precioCompra: 125.00, precioVenta: 180.00, stock: 40, stockMinimo: 12, estado: 'Activo' }
  ] as ProductoTech[],

  almacenes: [
    { id: 'alm-1', codigo: 'ALM-01', nombre: 'Almacén Central de Equipos', tipo: 'CENTRAL', direccion: 'Sede Principal - Av. Los Olivos 123', responsable: 'Carlos Mendoza Ramos', telefono: '+51 987 654 321', estado: 'Activo' },
    { id: 'alm-2', codigo: 'ALM-02', nombre: 'Almacén Secundario Distribución', tipo: 'SECUNDARIO', direccion: 'Planta de Distribución Norte', responsable: 'Jorge Paredes Alva', telefono: '+51 999 888 777', estado: 'Activo' },
    { id: 'alm-3', codigo: 'ALM-03', nombre: 'Almacén de Garantías y RMA', tipo: 'GARANTIA_RMA', direccion: 'Área Técnica - Av. Los Olivos 123 (Piso 2)', responsable: 'Walter Quispe', telefono: '+51 912 345 678', estado: 'Activo' }
  ] as AlmacenTech[],

  vendedores: [
    { id: 'v1', codigo: 'VEN-01', nombre: 'Raúl Quispe Palomino', email: 'rquispe@enterprise.com', telefono: '+51 934 567 890', comisionPct: 3.0, metaMensual: 45000, zona: 'Lima Norte & Centro', estado: 'Activo' },
    { id: 'v2', codigo: 'VEN-02', nombre: 'Mariela Sánchez Ortiz', email: 'msanchez@enterprise.com', telefono: '+51 978 123 456', comisionPct: 3.5, metaMensual: 60000, zona: 'Lima Sur & Provincias', estado: 'Activo' }
  ] as VendedorTech[],

  transportistas: [
    { id: 't1', ruc: '20601234567', razonSocial: 'Shalom Empresarial S.A.C.', vehiculoModelo: 'Furgón Hyundai H100 2.5T', vehiculoPlaca: 'BZ-9123', conductor: 'Pedro Castillo Medina', brevete: 'Q-44128912', telefono: '+51 945 112 233', estado: 'Activo' },
    { id: 't2', ruc: '20509876543', razonSocial: 'Olva Courier Express', vehiculoModelo: 'Camión Isuzu Forward 3.5T', vehiculoPlaca: 'F4-7801', conductor: 'Luis Torres Barreto', brevete: 'A-31298450', telefono: '+51 961 889 900', estado: 'Activo' }
  ] as TransportistaTech[],

  formasPago: [
    { id: 'fp-1', codigo: 'CONT', nombre: 'Contado Inmediato', diasCredito: 0, tipo: 'CONTADO', estado: 'Activo' },
    { id: 'fp-2', codigo: 'CRED-15', nombre: 'Crédito Comercial 15 días', diasCredito: 15, tipo: 'CREDITO', estado: 'Activo' },
    { id: 'fp-3', codigo: 'CRED-30', nombre: 'Crédito Factura 30 días', diasCredito: 30, tipo: 'CREDITO', estado: 'Activo' },
    { id: 'fp-4', codigo: 'CRED-60', nombre: 'Crédito Mayorista 60 días', diasCredito: 60, tipo: 'CREDITO', estado: 'Activo' }
  ] as FormaPagoTech[],

  monedas: [
    { id: 'm1', codigoIso: 'PEN', nombre: 'Sol Peruano', simbolo: 'S/', tipoCompra: 1.00, tipoVenta: 1.00, esBase: true },
    { id: 'm2', codigoIso: 'USD', nombre: 'Dólar Estadounidense', simbolo: '$', tipoCompra: 3.742, tipoVenta: 3.758, esBase: false }
  ] as MonedaTech[],

  listasPrecios: [
    { id: 'lp-1', codigo: 'LP-DIST', nombre: 'Lista Distribuidor Corporativo', ajustePct: -10, descripcion: 'Compras mayores a 10 equipos o clientes B2B', estado: 'Activo' },
    { id: 'lp-2', codigo: 'LP-MAYO', nombre: 'Lista Mayorista Estándar', ajustePct: 0, descripcion: 'Precio base de catálogo del ERP', estado: 'Activo' },
    { id: 'lp-3', codigo: 'LP-TIENDA', nombre: 'Lista Mostrador / Retail', ajustePct: 15, descripcion: 'Ventas por unidad al cliente final', estado: 'Activo' }
  ] as ListaPrecioTech[]
};

export const maestrosService = {
  getData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
        return INITIAL_DATA;
      }
      return JSON.parse(stored);
    } catch {
      return INITIAL_DATA;
    }
  },

  saveData(data: typeof INITIAL_DATA) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error(e);
    }
  },

  getProductos(): ProductoTech[] {
    return this.getData().productos;
  },

  saveProducto(prod: ProductoTech) {
    const data = this.getData();
    const idx = data.productos.findIndex((p: ProductoTech) => p.id === prod.id);
    if (idx >= 0) {
      data.productos[idx] = prod;
    } else {
      data.productos.unshift(prod);
    }
    this.saveData(data);
    return data.productos;
  },

  deleteProducto(id: string) {
    const data = this.getData();
    data.productos = data.productos.filter((p: ProductoTech) => p.id !== id);
    this.saveData(data);
    return data.productos;
  },

  getAlmacenes(): AlmacenTech[] {
    return this.getData().almacenes;
  },

  saveAlmacen(alm: AlmacenTech) {
    const data = this.getData();
    const idx = data.almacenes.findIndex((a: AlmacenTech) => a.id === alm.id);
    if (idx >= 0) data.almacenes[idx] = alm;
    else data.almacenes.push(alm);
    this.saveData(data);
    return data.almacenes;
  },

  getVendedores(): VendedorTech[] {
    return this.getData().vendedores;
  },

  saveVendedor(v: VendedorTech) {
    const data = this.getData();
    const idx = data.vendedores.findIndex((x: VendedorTech) => x.id === v.id);
    if (idx >= 0) data.vendedores[idx] = v;
    else data.vendedores.push(v);
    this.saveData(data);
    return data.vendedores;
  },

  getTransportistas(): TransportistaTech[] {
    return this.getData().transportistas;
  },

  saveTransportista(t: TransportistaTech) {
    const data = this.getData();
    const idx = data.transportistas.findIndex((x: TransportistaTech) => x.id === t.id);
    if (idx >= 0) data.transportistas[idx] = t;
    else data.transportistas.push(t);
    this.saveData(data);
    return data.transportistas;
  },

  getFormasPago(): FormaPagoTech[] {
    return this.getData().formasPago;
  },

  getMonedas(): MonedaTech[] {
    return this.getData().monedas;
  },

  saveMoneda(m: MonedaTech) {
    const data = this.getData();
    const idx = data.monedas.findIndex((x: MonedaTech) => x.id === m.id);
    if (idx >= 0) data.monedas[idx] = m;
    this.saveData(data);
    return data.monedas;
  },

  getListasPrecios(): ListaPrecioTech[] {
    return this.getData().listasPrecios;
  }
};
