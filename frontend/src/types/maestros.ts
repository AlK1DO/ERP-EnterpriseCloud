export interface ProductoMaestro {
  id: string;
  codigo: string; // SKU
  descripcion: string;
  categoria: string;
  unidadBase: string; // KGM, NIU, BOB, MIL, CJA
  pesoKg: number; // Peso unitario en kg (fundamental en plásticos)
  dimensiones: string; // Ej: 20x30 cm, e: 1.5 micras
  precioCompra: number;
  precioVentaBase: number;
  stockMinimo: number;
  codigoBarras?: string;
  estado: 'Activo' | 'Inactivo';
}

export interface ConversionUnidad {
  id: string;
  productoId?: string;
  productoNombre: string; // 'Todos' o producto específico
  umOrigen: string; // BOBINA, MILLAR, CAJA
  umDestino: string; // KGM, CIENTO, UND
  factor: number; // Ej: 1 BOBINA = 25 KGM (factor = 25)
  descripcion: string;
  estado: 'Activo' | 'Inactivo';
}

export type TipoAlmacen = 'MATERIA_PRIMA' | 'PRODUCTO_TERMINADO' | 'MERMA_RECICLADO' | 'TRANSITO' | 'GENERAL';

export interface AlmacenMaestro {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoAlmacen;
  sucursal: string;
  direccion: string;
  responsable: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
}

export interface TransportistaMaestro {
  id: string;
  rucDni: string;
  razonSocial: string;
  vehiculoPlaca: string;
  vehiculoModelo: string;
  conductorNombre: string;
  breveteLicencia: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
}

export interface VendedorMaestro {
  id: string;
  codigo: string;
  nombre: string;
  email: string;
  telefono: string;
  comisionPct: number; // Ej: 3.5%
  metaMensual: number; // En Soles
  zona: string;
  estado: 'Activo' | 'Inactivo';
}

export interface CondicionPagoMaestro {
  id: string;
  codigo: string;
  nombre: string; // Contado, Crédito 15 días, etc.
  diasCredito: number;
  tipo: 'CONTADO' | 'CREDITO';
  estado: 'Activo' | 'Inactivo';
}

export interface TipoCambioMaestro {
  id: string;
  fecha: string;
  moneda: string; // USD
  tipoCompra: number;
  tipoVenta: number;
  fuente: string; // SUNAT
}

export interface ListaPrecioMaestro {
  id: string;
  codigo: string;
  nombre: string; // Mayorista, Distribuidor, Público
  moneda: 'PEN' | 'USD';
  factorAjustePct: number; // -10% para distribuidor, 0% lista base, +15% retail
  estado: 'Activo' | 'Inactivo';
}
