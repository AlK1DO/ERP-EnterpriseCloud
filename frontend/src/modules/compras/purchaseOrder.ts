import type { Producto } from '../../services/inventarioService';
import type { Proveedor } from '../../services/proveedoresService';
import { commercialSnapshot } from '../../services/commercialBackup.ts';
import { assertInventoryReady } from '../../services/inventoryTransaction.ts';

export type SupplierSnapshot = Pick<Proveedor, 'id' | 'tipo_persona' | 'documento' | 'nombre'> & {
  direccion: string | null; email: string | null; telefono: string | null; condicion_pago: number | null;
};
export type ProductSnapshot = Pick<Producto, 'id' | 'codigo' | 'descripcion' | 'unidad'> & { categoria: string | null; almacen: string | null };
export type PurchaseLine = {
  id: string; producto_id: string; codigo: string; descripcion: string; unidad: string;
  cantidad: string; precioUnitario: string; producto_datos: ProductSnapshot;
};
export type PurchaseDraft = { id: string; proveedor: SupplierSnapshot | null; items: PurchaseLine[]; descuento: string };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export const PURCHASE_KEY = 'erp_ordenes_compra';
export function newPurchaseId() { return `OC-${new Date().getFullYear()}-${crypto.randomUUID()}`; }
export function supplierSnapshot(provider: Proveedor): SupplierSnapshot {
  return { id: provider.id, tipo_persona: provider.tipo_persona, documento: provider.documento, nombre: provider.nombre,
    direccion: provider.direccion || null, email: provider.email || null, telefono: provider.telefono || null,
    condicion_pago: typeof provider.condicion_pago === 'number' && Number.isFinite(provider.condicion_pago) && provider.condicion_pago >= 0 ? provider.condicion_pago : null };
}
export function supplierUsable(provider: Proveedor) {
  return Boolean(provider && provider.id && provider.estado === 'Activo' && typeof provider.nombre === 'string' && provider.nombre.trim()
    && (provider.tipo_persona === 'NATURAL' || provider.tipo_persona === 'JURIDICA')
    && typeof provider.documento === 'string' && (provider.tipo_persona === 'JURIDICA' ? /^\d{11}$/ : /^(?:\d{8}|\d{11})$/).test(provider.documento));
}
export function paymentLabel(days: number | null) { return days === null ? 'No registrada' : days === 0 ? 'Contado' : `${days} días`; }
export function productSnapshot(product: Producto): ProductSnapshot {
  return { id: product.id, codigo: product.codigo, descripcion: product.descripcion, unidad: product.unidad, categoria: product.categoria || null, almacen: product.almacen || null };
}
function readList<T>(storage: Pick<Storage, 'getItem'>, key: string): T[] {
  const raw = storage.getItem(key);
  if (raw === null) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error(`Datos inválidos en ${key}; no se reemplazaron.`);
  return value;
}
export function readPurchaseProducts(storage: Pick<Storage, 'getItem'>): Producto[] {
  assertInventoryReady(storage);
  return readList<Producto>(storage, 'erp_products_db').filter(p => typeof p.id === 'string' && p.id && typeof p.codigo === 'string' && p.codigo.trim() && typeof p.descripcion === 'string' && p.descripcion.trim() && typeof p.unidad === 'string' && p.unidad.trim());
}
export function positiveNumber(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} es obligatorio.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} debe ser un número mayor que cero.`);
  return number;
}
export function purchaseTotals(items: PurchaseLine[], discount: string) {
  const subtotal = items.reduce((sum, item, index) => sum + positiveNumber(item.cantidad, `Cantidad de línea ${index + 1}`) * positiveNumber(item.precioUnitario, `Precio de línea ${index + 1}`), 0);
  const descuento = discount.trim() === '' ? 0 : Number(discount);
  if (!Number.isFinite(subtotal) || !Number.isFinite(descuento) || descuento < 0 || descuento > subtotal) throw new Error('El descuento debe ser numérico, no negativo y no superar el subtotal.');
  const baseImponible = subtotal - descuento;
  const igv = baseImponible * 0.18;
  const total = baseImponible + igv;
  if (!Number.isFinite(total)) throw new Error('Los importes exceden el rango permitido.');
  return { subtotal, descuento, baseImponible, igv, total };
}
export function addPurchaseLine(product: Producto, quantity: string, price: string): PurchaseLine {
  positiveNumber(quantity, 'Cantidad'); positiveNumber(price, 'Precio unitario');
  const snapshot = productSnapshot(product);
  return { id: crypto.randomUUID(), producto_id: product.id, codigo: product.codigo, descripcion: product.descripcion, unidad: product.unidad, cantidad: quantity, precioUnitario: price, producto_datos: snapshot };
}
export function persistPurchase(storage: Store, draft: PurchaseDraft, providers: Proveedor[], now = new Date()) {
  if (!draft.id || !draft.proveedor || !draft.items.length) throw new Error('Selecciona un proveedor y agrega al menos un producto.');
  const totals = purchaseTotals(draft.items, draft.descuento);
  const fingerprint = JSON.stringify({ proveedor: draft.proveedor, items: draft.items, descuento: totals.descuento });
  const orders = readList<Record<string, any>>(storage, PURCHASE_KEY);
  const existing = orders.find(order => order.id === draft.id);
  if (existing) {
    if (existing.solicitud_firma !== fingerprint) throw new Error('Este identificador ya fue guardado con otros datos. Inicia una Nueva compra.');
    return existing as ReturnType<typeof buildOrder>;
  }
  const provider = providers.find(p => p.id === draft.proveedor!.id);
  if (!provider || !supplierUsable(provider)) throw new Error('El proveedor no está disponible, activo o tiene datos de identificación incompletos.');
  if (JSON.stringify(supplierSnapshot(provider)) !== JSON.stringify(draft.proveedor)) throw new Error('Los datos del proveedor cambiaron. Vuelve a seleccionarlo antes de guardar.');
  const catalog = readPurchaseProducts(storage);
  const productIds = new Set<string>();
  for (const item of draft.items) {
    const product = catalog.find(p => p.id === item.producto_id);
    if (!product || product.codigo !== item.codigo || product.descripcion !== item.descripcion || product.unidad !== item.unidad) throw new Error(`El producto ${item.codigo} cambió o no existe. Vuelve a seleccionarlo.`);
    if (productIds.has(product.id)) throw new Error('Hay productos repetidos; edita la cantidad de la línea existente.');
    productIds.add(product.id);
    if (JSON.stringify(productSnapshot(product)) !== JSON.stringify(item.producto_datos)) throw new Error(`Los datos del producto ${item.codigo} cambiaron. Vuelve a seleccionarlo.`);
  }
  function buildOrder() {
    return { id: draft.id, proveedor: draft.proveedor!.nombre, proveedor_id: draft.proveedor!.id,
      ruc: draft.proveedor!.documento.length === 11 ? draft.proveedor!.documento : '', documento: draft.proveedor!.documento,
      proveedor_datos: { ...draft.proveedor! }, fecha: now.toISOString(), moneda: 'PEN',
      subtotal: totals.subtotal, descuento: totals.descuento, baseImponible: totals.baseImponible, igv: totals.igv, total: totals.total,
      items: draft.items.map(item => ({ id: item.id, producto_id: item.producto_id, codigo: item.codigo, descripcion: item.descripcion, unidad: item.unidad,
        cantidad: positiveNumber(item.cantidad, 'Cantidad'), precioUnitario: positiveNumber(item.precioUnitario, 'Precio'),
        importe: Number(item.cantidad) * Number(item.precioUnitario), producto_datos: { ...item.producto_datos } })),
      estado: 'Pendiente de ingreso al Kardex', solicitud_firma: fingerprint };
  }
  const order = buildOrder();
  const backupKey = `erp_respaldo_compra_${draft.id}_${Date.now()}_${crypto.randomUUID()}`;
  storage.setItem(backupKey, JSON.stringify(commercialSnapshot(storage)));
  // One commercial write. Existing records are retained without migration.
  storage.setItem(PURCHASE_KEY, JSON.stringify([order, ...orders]));
  return order;
}
export function hasUnsavedPurchase(draft: { items: unknown[]; selectedSupplier: unknown; search: string; quantity: string; price: string; discount: string }, saved: boolean) {
  return !saved && Boolean(draft.items.length || draft.selectedSupplier || draft.search || draft.quantity || draft.price || draft.discount);
}
