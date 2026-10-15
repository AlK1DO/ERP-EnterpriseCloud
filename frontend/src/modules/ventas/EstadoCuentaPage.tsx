import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Printer, Search, FileBarChart } from 'lucide-react';

export interface ItemEstadoCuenta {
  tipo: string;
  fecha: string;
  nro: string;
  razonSocial: string;
  productos: string;
  vendedor: string;
  estado: string;
  total: number;
  saldo: number;
  pagado: number;
}

export const EstadoCuentaPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  
  const [filterText, setFilterText] = useState('');
  const [dateStart, setDateStart] = useState('2026-04-01');
  const [dateEnd, setDateEnd] = useState('2026-06-30');

  const [allData, setAllData] = useState<ItemEstadoCuenta[]>(() => {
    const cachedCuenta = localStorage.getItem('erp_estado_cuenta');
    if (cachedCuenta) {
      try {
        const localCuenta = JSON.parse(cachedCuenta);
        return Array.isArray(localCuenta) ? localCuenta : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Filtramos la data en tiempo real
  const filteredData = useMemo(() => {
    return allData.filter(d => 
      d.razonSocial.toLowerCase().includes(filterText.toLowerCase()) ||
      d.nro.toLowerCase().includes(filterText.toLowerCase()) ||
      d.vendedor.toLowerCase().includes(filterText.toLowerCase())
    );
  }, [filterText]);

  // Agrupamos por tipo de documento
  const groupedData = useMemo(() => {
    const groups: Record<string, ItemEstadoCuenta[]> = {};
    filteredData.forEach(item => {
      if (!groups[item.tipo]) groups[item.tipo] = [];
      groups[item.tipo].push(item);
    });
    return groups;
  }, [filteredData]);

  const formatCurrency = (val: number) => val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const exportToCSV = () => {
    const headers = ['Tipo', 'Fecha Venta', 'Nro Documento', 'Razón Social', 'Detalle de Productos', 'Vendedor', 'Estado', 'Total S/.', 'Saldo S/.', 'Pagado S/.'];
    let csvContent = headers.join(';') + '\n';
    
    filteredData.forEach(item => {
      const row = [
        item.tipo,
        item.fecha,
        item.nro,
        `"${item.razonSocial}"`,
        `"${item.productos}"`,
        item.vendedor,
        item.estado,
        item.total,
        item.saldo,
        item.pagado
      ];
      csvContent += row.join(';') + '\n';
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel UTF-8 support
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'estado_de_cuenta_ventas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto pb-10 font-sans print:p-0 print:m-0 print:w-full"
    >
      <style>
        {`
          @media print {
            @page { size: landscape; margin: 10mm; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}
      </style>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 mt-2 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-1.5 text-blue-500">
            <span>ERP</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span>VENTAS</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span>COBRANZAS</span>
            <span className="text-gray-300 dark:text-slate-600">/</span>
            <span className="text-gray-400 dark:text-slate-500">ESTADO DE CUENTA</span>
          </div>
          <h1 className={`text-[26px] font-bold tracking-tight leading-none ${darkMode ? 'text-white' : 'text-[#2d3436]'}`}>
            Estado de cuenta de ventas
          </h1>
          <p className={`mt-2 text-[13px] ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
            Sistema de control de ventas: revisa la deuda por tipo de documento y gestiona los pagos.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors border shadow-sm ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg transition-colors bg-[#0ea5e9] hover:bg-[#0284c7] text-white shadow-sm"
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h2 className="text-2xl font-bold mb-1">Estado de cuenta de ventas</h2>
        <p className="text-sm text-gray-600">Reporte generado el {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* TABLA PRINCIPAL (Izquierda) */}
        <div className={`flex-1 w-full rounded-2xl border shadow-sm overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
        } print:border-none print:shadow-none print:w-full print:rounded-none`}>
          
          <div className={`p-6 border-b print:hidden ${darkMode ? 'border-slate-800' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                darkMode ? 'bg-[#0ea5e9]/20 text-[#38bdf8]' : 'bg-[#e0f2fe] text-[#0284c7]'
              }`}>
                01
              </div>
              <div>
                <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  Detalle del estado de cuenta
                </h2>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                  {filteredData.length} documentos • Clic en una fila para gestionar pagos
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible print:w-full">
            <table className="w-full text-left text-[11px] border-separate border-spacing-y-2 print:border-spacing-y-0 print:border-collapse print:text-xs">
              <thead>
                <tr className={`text-[9px] uppercase tracking-wider font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} print:text-black print:border-b print:border-black`}>
                  <th className="px-3 py-2 first:rounded-l-lg last:rounded-r-lg">Fecha Venta</th>
                  <th className="px-3 py-2">Nro Documento</th>
                  <th className="px-3 py-2">Razón Social</th>
                  <th className="px-3 py-2">Detalle de Productos</th>
                  <th className="px-3 py-2">Vendedor</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-right">Total S/.</th>
                  <th className="px-3 py-2 text-right">Saldo S/.</th>
                  <th className="px-3 py-2 text-right first:rounded-l-lg last:rounded-r-lg">Pagado S/.</th>
                </tr>
              </thead>
              
              {Object.keys(groupedData).length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center opacity-50">
                        <FileBarChart size={32} className="mb-3 text-gray-400" />
                        <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          No se encontraron documentos
                        </p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                Object.entries(groupedData).map(([tipo, items]) => {
                  const totalMonto = items.reduce((acc, curr) => acc + curr.total, 0);
                  const totalSaldo = items.reduce((acc, curr) => acc + curr.saldo, 0);
                  const totalPagado = items.reduce((acc, curr) => acc + curr.pagado, 0);
                  
                  return (
                    <tbody key={tipo} className="print:divide-y print:divide-gray-400">
                      <tr>
                        <td colSpan={9} className="p-0 pt-3 print:pt-0">
                          <div className={`mb-1 px-3 py-2 rounded-xl flex items-center gap-2 ${
                            darkMode ? 'bg-indigo-900/30 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-100/50'
                          } print:bg-transparent print:border-b-2 print:border-black print:rounded-none print:px-0`}>
                            <FileBarChart className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'} print:hidden`} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              darkMode ? 'text-indigo-300' : 'text-indigo-700'
                            } print:text-black`}>
                              TIPO DE DOCUMENTO: {tipo}
                            </span>
                          </div>
                        </td>
                      </tr>
                      
                      {items.map((item, idx) => (
                        <tr key={idx} className={`group transition-all ${
                          darkMode ? 'bg-slate-800/40 hover:bg-slate-800' : 'bg-white hover:bg-slate-50 shadow-sm ring-1 ring-slate-900/5'
                        } print:shadow-none print:ring-0`}>
                          <td className={`px-3 py-2.5 rounded-l-xl print:rounded-none font-semibold print:text-black whitespace-nowrap ${
                            darkMode ? 'text-slate-300' : 'text-slate-700'
                          }`}>
                            {item.fecha}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${
                              darkMode ? 'bg-[#0ea5e9]/20 text-[#38bdf8]' : 'bg-[#e0f2fe] text-[#0284c7]'
                            } print:bg-transparent print:text-black`}>
                              {item.nro}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold print:hidden ${
                                darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.razonSocial.charAt(0)}
                              </div>
                              <span className={`font-semibold text-[11px] truncate max-w-[150px] ${darkMode ? 'text-white' : 'text-slate-900'} print:text-black`}>
                                {item.razonSocial}
                              </span>
                            </div>
                          </td>
                          <td className={`px-3 py-2.5 whitespace-normal max-w-[200px] text-[10px] leading-relaxed font-medium print:text-black ${
                            darkMode ? 'text-slate-300' : 'text-slate-900'
                          }`}>
                            {item.productos}
                          </td>
                          <td className={`px-3 py-2.5 font-bold print:text-black whitespace-nowrap ${
                            darkMode ? 'text-white' : 'text-black'
                          }`}>
                            {item.vendedor}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase whitespace-nowrap ${
                              item.estado === 'CANCELADO'
                                ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                                : darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-700'
                            } print:bg-transparent print:text-black`}>
                              <span className={`w-1 h-1 rounded-full print:hidden ${
                                item.estado === 'CANCELADO' ? 'bg-emerald-500' : 'bg-orange-500'
                              }`}></span>
                              {item.estado}
                            </span>
                          </td>
                          <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${darkMode ? 'text-white' : 'text-slate-800'} print:text-black`}>
                            {formatCurrency(item.total)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${
                            item.saldo > 0 ? (darkMode ? 'text-orange-400' : 'text-orange-600') : (darkMode ? 'text-slate-500' : 'text-slate-400')
                          } print:text-black`}>
                            {formatCurrency(item.saldo)}
                          </td>
                          <td className={`px-3 py-2.5 text-right rounded-r-xl print:rounded-none font-bold whitespace-nowrap ${
                            item.pagado > 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-slate-500' : 'text-slate-400')
                          } print:text-black`}>
                            {formatCurrency(item.pagado)}
                          </td>
                        </tr>
                      ))}
                      
                      <tr>
                        <td colSpan={6} className={`px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'} print:text-black`}>
                          TOTAL {tipo}
                        </td>
                        <td className={`px-3 py-3 text-right font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-800'} print:text-black`}>{formatCurrency(totalMonto)}</td>
                        <td className={`px-3 py-3 text-right font-bold text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'} print:text-black`}>{formatCurrency(totalSaldo)}</td>
                        <td className={`px-3 py-3 text-right font-bold text-xs ${darkMode ? 'text-emerald-400' : 'text-emerald-600'} print:text-black`}>{formatCurrency(totalPagado)}</td>
                      </tr>
                    </tbody>
                  );
                })
              )}
            </table>
          </div>
        </div>

        {/* SIDEBAR DERECHO (Filtros y Totales) - Se ocultan los filtros al imprimir, pero el resumen se muestra abajo */}
        <div className="w-full lg:w-[350px] space-y-6">
          
          {/* Box de Filtros */}
          <div className={`rounded-2xl border shadow-sm p-6 print:hidden ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
          }`}>
            <h3 className={`font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Filtros de búsqueda</h3>
            <p className={`text-xs mb-4 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>Selecciona el rango de fechas o busca texto</p>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-[10px] font-bold tracking-wider uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Filtrar por
                </label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} size={16} />
                  <input 
                    type="text" 
                    placeholder="Cliente, documento o vendedor"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Enter search logic (optional now since it's real-time)
                      }
                    }}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/50 ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-600' : 'bg-white border-gray-300 text-slate-800 placeholder-gray-400'
                    }`}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[10px] font-bold tracking-wider uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Fecha de Inicio
                  </label>
                  <input 
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/50 ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-bold tracking-wider uppercase mb-1.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Fecha de Fin
                  </label>
                  <input 
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-lg border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/50 ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-gray-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>
              
              <button 
                onClick={() => {
                  // Manual search trigger removed to favor real-time updates
                }}
                className="w-full mt-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
              >
                Consultar
              </button>
            </div>
          </div>

          {/* Box de Resumen */}
          <div className={`rounded-2xl border shadow-sm p-6 print:mt-10 print:border-none print:shadow-none print:w-full print:p-0 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'
          }`}>
            <h3 className={`font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'} print:text-xl print:mb-3`}>Resumen del Cliente</h3>
            <p className={`text-xs mb-6 ${darkMode ? 'text-slate-500' : 'text-gray-500'} print:hidden`}>Totales y detalle de productos</p>
            
            <div className="space-y-6 print:grid print:grid-cols-2 print:gap-8 print:space-y-0">
              {Object.entries(groupedData).map(([tipo, items]) => {
                const totalMonto = items.reduce((acc, curr) => acc + curr.total, 0);
                const totalSaldo = items.reduce((acc, curr) => acc + curr.saldo, 0);
                const totalPagado = items.reduce((acc, curr) => acc + curr.pagado, 0);
                
                return (
                  <div key={tipo} className={`pb-4 border-b last:border-0 last:pb-0 ${darkMode ? 'border-slate-800' : 'border-gray-100'} print:border-b-0 print:border-l-4 print:border-black print:pl-4 print:pb-0`}>
                    <p className={`text-[11px] font-bold tracking-widest uppercase mb-3 ${darkMode ? 'text-[#38bdf8]' : 'text-[#0ea5e9]'} print:text-black print:text-sm`}>
                      {tipo}
                    </p>

                    {/* Detalle de compras (solo visible al filtrar) */}
                    {filterText.trim() !== '' && (
                      <div className={`mb-4 rounded-lg p-3 border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-gray-100'} print:bg-transparent print:border-black`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-400' : 'text-gray-500'} print:text-black`}>
                          Detalle de compras:
                        </p>
                        <ul className="space-y-3">
                          {items.map((item, idx) => (
                            <li key={idx} className="flex flex-col gap-0.5">
                              <div className="flex justify-between items-center">
                                <span className={`text-[11px] font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'} print:text-black`}>{item.nro}</span>
                                <span className={`text-[11px] font-bold ${darkMode ? 'text-[#38bdf8]' : 'text-[#0ea5e9]'} print:text-black`}>{formatCurrency(item.total)}</span>
                              </div>
                              <span className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-gray-500'} print:text-black`}>
                                {item.productos}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-1.5 text-sm print:text-base">
                      <div className={`flex justify-between ${darkMode ? 'text-slate-300' : 'text-slate-600'} print:text-black`}>
                        <span>Total:</span>
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'} print:text-black`}>{formatCurrency(totalMonto)}</span>
                      </div>
                      <div className={`flex justify-between ${darkMode ? 'text-emerald-400' : 'text-emerald-600'} print:text-black`}>
                        <span>Pagado:</span>
                        <span className="font-medium">{formatCurrency(totalPagado)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'} print:text-black`}>
                        <span>Saldo:</span>
                        <span>{formatCurrency(totalSaldo)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          

          
          
        </div>
      </div>
    </motion.div>
  );
};
