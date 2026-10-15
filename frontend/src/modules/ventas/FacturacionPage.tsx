import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { buildInvoice, emitLocalInvoice, readBillingData, readLocalIssuer, saveLocalIssuer } from '../../services/billing';
import type { BillingRow, Issuer } from '../../services/billing';
import { recoverBilling, withBillingLock } from '../../services/billingTransaction';
import { InvoiceDocument } from './InvoiceDocument';

export const FacturacionPage = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  const auth = useAuth();
  const [data, setData] = useState<ReturnType<typeof readBillingData>>({ orders: [], invoices: [] });
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<BillingRow | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingRow | null>(null);
  const [search, setSearch] = useState('');
  const [issuedTab, setIssuedTab] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuer, setIssuer] = useState<Issuer | null>(() => { if (auth.company) return auth.company; try { return auth.role === 'admin' && auth.user ? readLocalIssuer(localStorage, auth.user.id) : null; } catch { return null; } });
  const [issuerForm, setIssuerForm] = useState<Issuer>(issuer ?? { ruc: '', legalName: '', fiscalAddress: '' });
  const [requestId, setRequestId] = useState('');
  const pending = useRef(false), active = useRef(true);
  async function reload() {
    try {
      const value = await withBillingLock(() => { recoverBilling(localStorage); return readBillingData(localStorage); });
      if (active.current) { setData(value); setError(null); }
    } catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : 'No se pudieron leer los datos.'); }
    finally { if (active.current) setLoading(false); }
  }
  useEffect(() => {
    active.current = true; void Promise.resolve().then(reload);
    return () => { active.current = false; };
  }, []);
  const pendingOrders = data.orders.filter(order => order.estado !== 'Facturada' && order.estado !== 'Anulada' && !order.comprobante_nro && !data.invoices.some(invoice => invoice.orden_id === order.id));
  const rows = (issuedTab ? data.invoices : pendingOrders).filter(row => [row.id, row.nro, row.cliente, row.razonSocial].some(value => String(value ?? '').toLowerCase().includes(search.toLowerCase())));
  let preview: BillingRow | null = null, previewError: string | null = null;
  if (selectedOrder) {
    try { preview = buildInvoice(selectedOrder, issuer, auth.user?.email ?? '', requestId, 'BORRADOR — SIN EMITIR'); }
    catch (failure) { previewError = failure instanceof Error ? failure.message : 'Revisa los datos de la orden.'; }
  }
  const document = selectedInvoice ?? preview;
  async function emit() {
    if (!selectedOrder || pending.current || !auth.user || loading) return;
    pending.current = true; setSaving(true); setError(null);
    try {
      const invoice = await withBillingLock(() => {
        if (!active.current) throw new Error('La pantalla se cerró antes de emitir.');
        return emitLocalInvoice(localStorage, selectedOrder.id, issuer, auth.user!.email ?? '', requestId);
      });
      if (active.current) { setSelectedInvoice(invoice); setSelectedOrder(null); setIssuedTab(true); await reload(); }
    } catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : 'No se pudo emitir.'); }
    finally { pending.current = false; if (active.current) setSaving(false); }
  }
  const card = darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-slate-800';
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[1400px] mx-auto pb-10 print:p-0 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
    <header className="flex flex-wrap justify-between gap-4 mb-6 print:hidden"><div><p className="text-xs text-sky-500 mb-2">ERP / VENTAS / FACTURACIÓN</p><h1 className={`text-[26px] font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Facturación</h1><p className="text-sm text-slate-500 mt-2">Emite comprobantes locales desde órdenes de venta. Sin validación de SUNAT.</p></div><div className="flex gap-3 items-center"><button type="button" onClick={() => void reload()} className="px-4 py-2 border rounded-lg">Actualizar / recuperar</button><button type="button" disabled={!selectedInvoice || saving} onClick={() => window.print()} className="px-4 py-2 bg-sky-500 text-white rounded-lg disabled:opacity-40">Imprimir comprobante seleccionado</button></div></header>
    {error && <p role="alert" className="mb-4 p-4 border border-red-300 rounded-xl text-red-500 print:hidden">{error}</p>}
    {auth.role === 'admin' && <form onSubmit={event => { event.preventDefault(); try { saveLocalIssuer(localStorage, auth.user!.id, issuerForm); setIssuer({ ...issuerForm }); setError(null); } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar el emisor.'); } }} className={`mb-6 p-5 border rounded-2xl ${card} print:hidden`}>
      <h2 className="font-bold">Emisor local de esta cuenta administradora</h2><p className="text-xs text-slate-500 my-2">Declara los datos de la empresa a la que representas. Se guardan solo para esta cuenta en este navegador; no se toma una empresa ajena ni se verifica su titularidad.</p>
      <fieldset disabled={saving} className="flex flex-wrap gap-3 items-end">{(['ruc', 'legalName', 'fiscalAddress'] as const).map((field, index) => <label key={field} className="text-xs flex-1 min-w-40">{['RUC', 'Razón social', 'Dirección fiscal'][index]}<input required value={issuerForm[field]} onChange={event => setIssuerForm(previous => ({ ...previous, [field]: event.target.value }))} className="block w-full mt-1 p-2 border rounded-lg bg-transparent" /></label>)}<button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-lg">Guardar emisor</button></fieldset>
    </form>}
    <div className="flex flex-col lg:flex-row gap-6 items-start print:block">
      <aside className={`w-full lg:w-[400px] border rounded-2xl shadow-sm overflow-hidden print:hidden ${card}`}><div className="p-5 border-b"><div className="flex gap-3 mb-4"><button type="button" onClick={() => setIssuedTab(false)} className="font-semibold">Pendientes ({pendingOrders.length})</button><button type="button" onClick={() => setIssuedTab(true)} className="font-semibold">Emitidos</button></div><input aria-label="Buscar órdenes o comprobantes" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cliente, orden o documento" className="w-full p-2 border rounded-lg bg-transparent" /></div><div className="p-3 space-y-2 max-h-[65vh] overflow-auto">
        {loading ? <p role="status">Cargando…</p> : rows.length === 0 ? <p className="p-6 text-slate-500">No hay registros para esta búsqueda.</p> : rows.map((row, index) => <button type="button" disabled={saving} key={row.id || `${row.nro}-${index}`} onClick={() => { setError(null); if (issuedTab) { setSelectedInvoice(row); setSelectedOrder(null); } else { setSelectedOrder(row); setSelectedInvoice(null); setRequestId(`EMI-${crypto.randomUUID()}`); } }} className={`block w-full text-left p-4 rounded-xl border ${selectedOrder?.id === row.id || selectedInvoice === row ? 'border-sky-400 bg-sky-500/10' : darkMode ? 'border-slate-800' : 'border-gray-100'}`}><p className="text-xs font-mono break-all">{issuedTab ? row.nro : row.id}</p><p className="font-semibold mt-1">{row.cliente || row.razonSocial}</p><p className="text-xs mt-1">{row.moneda ?? 'PEN'} {row.total}</p></button>)}
      </div></aside>
      <section className="flex-1 min-w-0 w-full">{previewError && <p role="alert" className="mb-4 p-4 border border-orange-300 rounded-xl text-orange-600 print:hidden">{previewError}</p>}{document ? <><InvoiceDocument invoice={document} darkMode={darkMode} />{selectedOrder && <button type="button" onClick={() => void emit()} disabled={saving || Boolean(previewError) || !issuer} className="mt-5 w-full py-4 rounded-xl bg-sky-500 text-white font-bold disabled:opacity-40 print:hidden">{saving ? 'Registrando…' : 'Registrar comprobante local'}</button>}</> : <div className={`p-12 border border-dashed rounded-2xl text-center ${card} print:hidden`}>Selecciona una orden o un comprobante emitido. {!issuer && 'Configura el emisor antes de emitir.'}</div>}</section>
    </div>
  </motion.div>;
};
