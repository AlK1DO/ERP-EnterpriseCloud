import { useEffect, useRef, useState } from 'react';
import { accountBalance, currencyOf, invoiceKey, PAYMENT_METHODS, persistPayment } from '../../services/billing';
import type { BillingRow } from '../../services/billing';
import { withBillingLock } from '../../services/billingTransaction';
import { dateKey } from '../dashboard/dashboardAnalytics';
export function PaymentDialog({ row, darkMode, onClose, onSaved }: { row: BillingRow; darkMode: boolean; onClose: () => void; onSaved: (row: BillingRow) => void }) {
  const [amount, setAmount] = useState(''), [date, setDate] = useState(() => dateKey(new Date().toISOString())!);
  const [method, setMethod] = useState('Efectivo'), [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null), [saved, setSaved] = useState(false), [pending, setPending] = useState(false);
  const request = useRef(`PAGO-${crypto.randomUUID()}`), busy = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  let balance: ReturnType<typeof accountBalance> | null = null, problem: string | null = null;
  try { balance = accountBalance(row); } catch (failure) { problem = failure instanceof Error ? failure.message : 'Importes inválidos'; }
  const currency = row.moneda ?? 'PEN';
  const money = (value: number) => `${currency} ${(value / 100).toFixed(2)}`;
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy.current || saved || !balance) return;
    busy.current = true; setPending(true); setError(null);
    try {
      const updated = await withBillingLock(() => {
        if (!alive.current) throw new Error('La pantalla de cobro se cerró.');
        return persistPayment(localStorage, { id: request.current, invoiceId: invoiceKey(row), importe: amount, fecha: date, medio: method, referencia: reference, moneda: currencyOf(row) });
      });
      if (alive.current) { onSaved(updated); setSaved(true); }
    } catch (failure) { if (alive.current) setError(failure instanceof Error ? failure.message : 'No se pudo guardar el pago.'); }
    finally { busy.current = false; if (alive.current) setPending(false); }
  }
  return <div role="dialog" aria-modal="true" aria-labelledby="payment-title" className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 print:hidden"><div className={`w-full max-w-xl max-h-[90vh] overflow-auto rounded-2xl p-6 border shadow-xl ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-slate-800'}`}>
    <div className="flex justify-between gap-3"><h2 id="payment-title" className="text-lg font-bold">Cobrar / historial de pagos</h2><button type="button" disabled={pending} onClick={onClose}>Cerrar</button></div>
    <p className="mt-3 font-semibold">{row.nro} · {row.razonSocial}</p><p className="text-sm mt-1">Moneda: {currency} · Total: {balance ? money(balance.total) : row.total} · Saldo: {balance ? money(balance.balance) : row.saldo}</p>
    {(problem || error) && <p role="alert" className="my-3 text-red-500">{problem || error}</p>}
    {balance && <><p className="mt-3 text-sm">Pagado: {money(balance.paid)} · Pendiente: {money(balance.balance)}</p>{balance.antecedent > 0 && <p className="mt-2 text-xs text-orange-500">Antecedente conservado sin detalle de pagos: {money(balance.antecedent)}. No es un pago nuevo.</p>}
    {saved && <p role="status" className="mt-3 text-emerald-500">Pago guardado. Saldo actualizado.</p>}
    {balance.balance > 0 && <form onSubmit={event => void save(event)} className="mt-4 space-y-3"><fieldset disabled={pending || saved} className="space-y-3">
      <label className="block text-sm">Importe ({currency})<input aria-label="Importe del pago" type="number" step="0.01" min="0.01" required value={amount} onChange={event => setAmount(event.target.value)} className="block w-full mt-1 p-2 border rounded-lg bg-transparent" /></label>
      <button type="button" onClick={() => setAmount((balance!.balance / 100).toFixed(2))} className="text-sky-500 underline text-sm">Usar saldo total</button>
      <label className="block text-sm">Fecha<input type="date" required value={date} onChange={event => setDate(event.target.value)} className="block w-full mt-1 p-2 border rounded-lg bg-transparent" /></label>
      <label className="block text-sm">Medio de pago<select value={method} onChange={event => setMethod(event.target.value)} className={`block w-full mt-1 p-2 border rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>{PAYMENT_METHODS.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="block text-sm">Referencia (opcional)<input value={reference} onChange={event => setReference(event.target.value)} className="block w-full mt-1 p-2 border rounded-lg bg-transparent" /></label>
      <button type="submit" className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold">{pending ? 'Guardando…' : 'Guardar pago'}</button>
    </fieldset>{saved && <button type="button" onClick={() => { request.current = `PAGO-${crypto.randomUUID()}`; setSaved(false); setAmount(''); setReference(''); }} className="text-sky-500 underline">Registrar otro pago</button>}</form>}
    <h3 className="font-bold mt-5">Historial registrado</h3><ul className="mt-2 space-y-2 text-xs">{balance.payments.length ? balance.payments.map(payment => <li key={payment.id} className="border-t pt-2 break-words">{payment.fecha} · {money(payment.importe_centavos)} · {payment.medio} · {payment.referencia || 'Sin referencia'}<p className="text-slate-500">{payment.id}</p></li>) : <li>No hay pagos con detalle registrado.</li>}</ul></>}
  </div></div>;
}
