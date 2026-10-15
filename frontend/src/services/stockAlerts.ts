export type StockState = 'NORMAL' | 'BAJO' | 'AGOTADO' | 'INCONSISTENTE';
export function stockState(product: { stock?: unknown; stockMinimo?: unknown }): StockState {
  const valid = (v: unknown) => (typeof v === 'number' || typeof v === 'string') && String(v).trim() !== '' && Number.isFinite(Number(v));
  if (!valid(product.stock) || !valid(product.stockMinimo) || Number(product.stock) < 0 || Number(product.stockMinimo) < 0) return 'INCONSISTENTE';
  if (Number(product.stock) === 0) return 'AGOTADO';
  return Number(product.stock) <= Number(product.stockMinimo) ? 'BAJO' : 'NORMAL';
}
export function stockSummary(products: { stock?: unknown; stockMinimo?: unknown }[]) {
  const states = products.map(stockState);
  return { critical: states.filter(s => s === 'BAJO' || s === 'AGOTADO').length, inconsistent: states.filter(s => s === 'INCONSISTENTE').length };
}
