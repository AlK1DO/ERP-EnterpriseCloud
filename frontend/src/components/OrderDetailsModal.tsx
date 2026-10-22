import React from 'react';
import { Eye, X } from 'lucide-react';

export interface OrderDetailLine {
  code?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface OrderDetails {
  number: string;
  partyName: string;
  document?: string;
  date: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  lines: OrderDetailLine[];
}

interface OrderDetailsModalProps {
  title: string;
  order: OrderDetails;
  darkMode: boolean;
  onClose: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ title, order, darkMode, onClose }) => {
  const formatCurrency = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const parsedDate = new Date(order.date);
  const displayDate = Number.isNaN(parsedDate.getTime()) ? order.date : parsedDate.toLocaleDateString('es-PE');
  const panelClass = darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <section className={`my-auto w-full max-w-3xl overflow-hidden rounded-2xl border shadow-2xl ${panelClass} ${darkMode ? 'border-slate-800' : 'border-gray-200'}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className={`flex items-center justify-between border-b px-6 py-4 ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <Eye className="text-sky-500" size={20} />
            <div>
              <h2 className="font-bold">{title}</h2>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{order.number}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalles" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
            <X size={18} />
          </button>
        </header>

        <div className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Cliente / proveedor', order.partyName],
              ['Documento', order.document || 'No registrado'],
              ['Fecha', displayDate],
              ['Estado', order.status]
            ].map(([label, value]) => (
              <div key={label} className={`rounded-xl p-3 ${darkMode ? 'bg-slate-800/70' : 'bg-slate-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
                <p className="mt-1 break-words text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className={`overflow-x-auto rounded-xl border ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}>
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">Precio unitario</th>
                  <th className="px-4 py-3 text-right">Importe</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
                {order.lines.length ? order.lines.map((line, index) => (
                  <tr key={`${line.code ?? line.description}-${index}`}>
                    <td className="px-4 py-3">
                      {line.code && <span className={`mr-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{line.code}</span>}
                      {line.description}
                    </td>
                    <td className="px-4 py-3 text-right">{line.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(line.unitPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(line.amount)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No hay productos registrados en esta orden.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {order.notes && <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}><strong>Notas:</strong> {order.notes}</p>}

          <div className={`ml-auto max-w-xs space-y-2 border-t pt-4 text-sm ${darkMode ? 'border-slate-800' : 'border-gray-200'}`}>
            <p className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">IGV</span><span>{formatCurrency(order.tax)}</span></p>
            <p className="flex justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(order.total)}</span></p>
          </div>
        </div>
      </section>
    </div>
  );
};
