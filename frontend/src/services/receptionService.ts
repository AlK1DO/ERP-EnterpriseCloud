import type { MovimientoKardex, Producto } from './inventarioService';
import { assertInventoryReady, commitInventoryTransaction } from './inventoryTransaction.ts';
type Row = Record<string, any>;
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type ReceiptItem = { id: string; productoId: string; codigo: string; descripcion: string; almacen: string; cantidad: number; costoUnitario: number; total: number; ordenLineaId?: string };
export type ReceiptDraft = { id: string; ordenId: string; tipoOperacion: 'COMPRA' | 'INGRESO_AJUSTE' | 'DEVOLUCION'; documentoTipo: string; documentoNumero: string; almacen: string; observaciones: string; proveedorId: string; items: ReceiptItem[] };
export function readReceptionData(storage: Pick<Storage, 'getItem'>) {
  assertInventoryReady(storage);
  function rows<T>(key: string): T[] {
    const raw = storage.getItem(key);
    if (raw === null) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error(`Datos inválidos en ${key}; no se reemplazaron.`);
    return data;
  }
  return { products: rows<Producto>('erp_products_db'), movements: rows<MovimientoKardex & Row>('erp_kardex_movimientos'), orders: rows<Row>('erp_ordenes_compra') };
}
function positive(value: unknown, label: string) {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) <= 0) throw new Error(`${label} debe ser un número positivo y finito.`);
  return Number(value);
}
function complete(order: Row) { return ['ingresado al kardex', 'recibida', 'recibido', 'anulada', 'anulado'].includes(String(order.estado).toLowerCase()) || Boolean(order.recepcion_id); }
function linkedMovement(movement: Row, order: Row) { return movement.tipoMovimiento === 'ENTRADA' && movement.tipoOperacion === 'COMPRA' && (movement.orden_id === order.id || (!movement.orden_id && movement.documentoTipo === 'ORDEN DE COMPRA' && movement.documentoNumero === order.id)); }
export function orderRemaining(order: Row, movements: Row[]) {
  if (!Array.isArray(order.items) || !order.items.length) throw new Error('La orden no tiene líneas válidas.');
  const received = movements.filter(m => linkedMovement(m, order));
  const productKeys = order.items.map((line: Row) => String(line?.producto_id || line?.codigo));
  if (new Set(productKeys).size !== productKeys.length && received.length) throw new Error('La orden tiene líneas repetidas y recepción parcial; no se puede asignar su historial con certeza. Revisa las líneas antes de continuar.');
  const available = new Map<string, number>();
  for (const movement of received) {
    const key = String(movement.productoId || movement.productoCodigo);
    available.set(key, (available.get(key) ?? 0) + positive(movement.cantEntrada, 'Cantidad histórica'));
  }
  const remaining = order.items.map((line: Row, index: number) => {
    if (!line || typeof line !== 'object' || !line.codigo) throw new Error('Una línea de la orden carece de código.');
    const ordered = positive(line.cantidad, 'Cantidad de orden');
    positive(line.precioUnitario, 'Precio de orden');
    const matchingKeys = new Set(received.filter(m => line.producto_id ? m.productoId === line.producto_id : m.productoCodigo === line.codigo).map(m => String(m.productoId || m.productoCodigo)));
    let pending = ordered;
    for (const key of matchingKeys) {
      const count = available.get(key) ?? 0, applied = Math.min(pending, count);
      pending -= applied; available.set(key, count - applied);
    }
    return { line, index, pending: Math.max(0, Number(pending.toPrecision(12))) };
  });
  if ([...available.values()].some(value => value > 1e-9)) throw new Error('Las recepciones históricas no coinciden con las cantidades de la orden. Revisa el historial.');
  return remaining;
}
export function pendingPurchaseOrders(orders: Row[], movements: Row[]) {
  return orders.filter(order => {
    if (complete(order)) return false;
    try { return orderRemaining(order, movements).some(line => line.pending > 0); } catch { return true; }
  });
}
export function orderReceiptItems(order: Row, products: Producto[], movements: Row[], warehouse: string): ReceiptItem[] {
  if (!order || typeof order.id !== 'string' || !order.id) throw new Error('No se encontró una orden válida.');
  if (complete(order)) throw new Error('La orden ya está recibida o anulada.');
  if ((order.moneda ?? 'PEN') !== 'PEN') throw new Error('El inventario actual usa PEN; falta definir conversión para recibir otra moneda.');
  return orderRemaining(order, movements).filter(({ pending }) => pending > 0).map(({ line, index, pending }) => {
    const matches = line.producto_id ? products.filter(p => p.id === line.producto_id) : products.filter(p => p.codigo === line.codigo || p.codigosAnteriores?.includes(line.codigo));
    if (matches.length !== 1) throw new Error(`No se puede identificar inequívocamente el producto ${line.codigo}. Revisa el catálogo.`);
    const product = matches[0], cost = positive(line.precioUnitario, 'Costo de orden');
    return { id: String(line.id ?? `linea-${index}`), ordenLineaId: String(line.id ?? `linea-${index}`), productoId: product.id, codigo: line.codigo, descripcion: line.descripcion, almacen: warehouse, cantidad: pending, costoUnitario: cost, total: pending * cost };
  });
}
export function receiptSupplier(order: Row, providers: Row[]) {
  if (order.proveedor_datos) return { ...order.proveedor_datos };
  const matches = order.proveedor_id ? providers.filter(p => p.id === order.proveedor_id) : providers.filter(p => p.nombre === order.proveedor && (!order.ruc || p.documento === order.ruc));
  return matches.length === 1 ? { ...matches[0] } : { nombre: order.proveedor || null, documento: order.documento || order.ruc || null, direccion: null, email: null, telefono: null };
}
export function filterReceiptMovements<T extends { recepcion_id?: string }>(movements: T[], receiptId: string | null) { return receiptId ? movements.filter(m => m.recepcion_id === receiptId) : movements; }
export function persistReception(storage: Store, draft: ReceiptDraft, now = new Date()) {
  const data = readReceptionData(storage);
  if (!draft.id || !draft.items.length || !draft.documentoTipo.trim() || !draft.documentoNumero.trim() || !draft.almacen.trim()) throw new Error('Completa documento de recepción, almacén y al menos una línea.');
  if (!['COMPRA', 'INGRESO_AJUSTE', 'DEVOLUCION'].includes(draft.tipoOperacion)) throw new Error('Tipo de operación inválido.');
  const signature = JSON.stringify(draft);
  const prior = data.movements.filter(m => m.recepcion_id === draft.id);
  if (prior.length) {
    if (prior.length !== draft.items.length || prior.some(m => m.recepcion_firma !== signature)) throw new Error('El identificador de recepción ya existe con otros datos.');
    return { id: draft.id, movements: prior };
  }
  let order: Row | undefined;
  if (draft.ordenId) {
    order = data.orders.find(o => o.id === draft.ordenId);
    if (!order || draft.tipoOperacion !== 'COMPRA') throw new Error('La orden no existe o el tipo de operación no corresponde.');
    const expected = orderReceiptItems(order, data.products, data.movements, draft.almacen);
    if (expected.length !== draft.items.length || expected.some((line, index) => ['productoId', 'cantidad', 'costoUnitario', 'ordenLineaId'].some(field => line[field as keyof ReceiptItem] !== draft.items[index][field as keyof ReceiptItem]))) throw new Error('Las cantidades pendientes cambiaron o falta una línea. Vuelve a cargar la orden.');
    if (!expected.length) throw new Error('La orden ya no tiene cantidades pendientes.');
  }
  if (draft.items.some(line => !line.id || !Number.isFinite(line.total))) throw new Error('Hay una línea inválida.');
  const products = data.products.map(p => ({ ...p }));
  const movements: (MovimientoKardex & Row)[] = [];
  const ids = new Set<string>();
  for (const [index, line] of draft.items.entries()) {
    const matches = products.filter(p => p.id === line.productoId);
    const product = matches[0];
    if (matches.length !== 1 || !product || typeof product.id !== 'string' || !product.id || !product.codigo || !product.descripcion) throw new Error('Un producto no existe, está incompleto o es ambiguo. No se registró ninguna línea.');
    if (ids.has(line.id)) throw new Error('Hay líneas repetidas en la recepción.');
    ids.add(line.id);
    const qty = positive(line.cantidad, 'Cantidad'), cost = positive(line.costoUnitario, 'Costo');
    if ([product.stock, product.costoUnitario].some(value => (typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error(`Stock o costo previo inválido para ${product.codigo}.`);
    const oldStock = Number(product.stock), oldCost = Number(product.costoUnitario);
    const stock = oldStock + qty, average = (oldStock * oldCost + qty * cost) / stock;
    if (![stock, average, qty * cost, stock * average].every(Number.isFinite)) throw new Error('Importes fuera de rango.');
    product.stock = stock; product.costoUnitario = average;
    movements.push({ id: `${draft.id}-${index}`, fecha: now.toISOString(), productoId: product.id, productoCodigo: product.codigo, productoDescripcion: product.descripcion,
      tipoMovimiento: 'ENTRADA', tipoOperacion: draft.tipoOperacion, documentoTipo: draft.documentoTipo.trim(), documentoNumero: draft.documentoNumero.trim().toUpperCase(),
      detalle: draft.observaciones.trim() || 'Recepción de mercadería', almacen: draft.almacen.trim(),
      cantEntrada: qty, costoEntrada: cost, totalEntrada: qty * cost, saldoCantidad: stock, saldoCostoUnitario: average, saldoTotal: stock * average,
      recepcion_id: draft.id, recepcion_firma: signature, orden_id: draft.ordenId || null, orden_linea_id: line.ordenLineaId ?? null, proveedor_id: draft.proveedorId || null });
  }
  const after: Record<string, string> = { erp_products_db: JSON.stringify(products), erp_kardex_movimientos: JSON.stringify([...movements].reverse().concat(data.movements)) };
  if (order) after.erp_ordenes_compra = JSON.stringify(data.orders.map(o => o.id === draft.ordenId ? { ...o, estado: 'Ingresado al Kardex', recepcion_id: draft.id, fecha_recepcion: now.toISOString() } : o));
  commitInventoryTransaction(storage, after, draft.id);
  return { id: draft.id, movements };
}
