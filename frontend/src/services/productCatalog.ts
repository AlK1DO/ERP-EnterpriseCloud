import type { Producto } from './inventarioService';
export function validateProduct(product: Producto, others: Producto[]) {
  for (const key of ['codigo', 'descripcion', 'categoria'] as const) if (typeof product[key] !== 'string' || !product[key].trim()) throw new Error('Codigo, descripcion y categoria son obligatorios.');
  if (others.some(p => p.id !== product.id && [p.codigo, ...(p.codigosAnteriores ?? [])].some(code => code.trim().toUpperCase() === product.codigo.trim().toUpperCase()))) throw new Error('El codigo ya pertenece a otro producto.');
  for (const key of ['precioVenta', 'stockMinimo'] as const) if (typeof product[key] !== 'number' || !Number.isFinite(product[key]) || product[key] < 0) throw new Error('Precio y minimo deben ser numericos y no negativos.');
}
export function assertProductDeletable(storage: Pick<Storage, 'getItem'>, product: Producto) {
  if (typeof product.stock !== 'number' || product.stock !== 0) throw new Error('No se puede eliminar: tiene existencias o stock inconsistente.');
  function refers(value: unknown): boolean {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.some(refers);
    const row = value as Record<string, unknown>;
    if (['productoId', 'producto_id'].some(k => row[k] === product.id) || ['productoCodigo', 'codigo', 'sku'].some(k => [product.codigo, ...(product.codigosAnteriores ?? [])].includes(String(row[k])))) return true;
    // Comprobantes antiguos pueden conservar solo la descripcion del producto.
    if (['desc', 'descripcion', 'productoDescripcion'].some(k => [product.descripcion, ...(product.descripcionesAnteriores ?? [])].includes(String(row[k])))) return true;
    if (typeof row.productos === 'string' && [product.descripcion, ...(product.descripcionesAnteriores ?? [])].some(description => String(row.productos).includes(description))) return true;
    return Object.values(row).some(refers);
  }
  for (const key of ['erp_ordenes_compra','erp_ordenes_venta','erp_estado_cuenta','erp_kardex_movimientos']) {
    const raw = storage.getItem(key); if (raw === null) continue;
    const rows = JSON.parse(raw); if (!Array.isArray(rows)) throw new Error('No se pudo comprobar el historial. No se elimino el producto.');
    if (refers(rows)) throw new Error('No se puede eliminar: esta referenciado en ordenes, comprobantes o movimientos.');
  }
}
