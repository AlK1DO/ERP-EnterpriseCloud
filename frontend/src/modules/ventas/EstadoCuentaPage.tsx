import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Printer, Search, FileBarChart, Coins, CheckCircle2, X } from 'lucide-react';
import { ventasService } from '../../services/ventasService';
import { supabase } from '@/lib/supabase';

export interface ItemEstadoCuenta {
  id?: string;
  dbId?: string;
  tipo: string;
  fecha: string;
  rawFecha?: string;
  nro: string;
  razonSocial: string;
  productos: string;
  metodoPago: string;
  estado: string;
  total: number;
  saldo: number;
  pagado: number;
}

export const EstadoCuentaPage: React.FC = () => {
  const { darkMode } = useOutletContext<{ darkMode: boolean }>();
  
  const [filterText, setFilterText] = useState('');
  const [dateStart, setDateStart] = useState('2026-01-01');
  const [dateEnd, setDateEnd] = useState('2026-12-31');
  const [allData, setAllData] = useState<ItemEstadoCuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [consultFeedback, setConsultFeedback] = useState<string | null>(null);

  // Estados para el Modal de Cobro
  const [cobroModalItem, setCobroModalItem] = useState<ItemEstadoCuenta | null>(null);
  const [cobroAmount, setCobroAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo');
  const [nroOperacion, setNroOperacion] = useState<string>('');
  const [isProcessingCobro, setIsProcessingCobro] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cargar comprobantes reales desde Supabase y localStorage
  useEffect(() => {
    const loadRealVentas = async () => {
      setLoading(true);
      try {
        const ventas = await ventasService.getVentas();
        const cachedCuenta = localStorage.getItem('erp_estado_cuenta');
        const cuentaDB: ItemEstadoCuenta[] = cachedCuenta ? JSON.parse(cachedCuenta) : [];

        const mapped: ItemEstadoCuenta[] = ventas.map(v => {
          const isFactura = v.cliente_nombre.toUpperCase().includes('S.A.') || 
                            v.cliente_nombre.toUpperCase().includes('E.I.R.L.') || 
                            v.cliente_nombre.toUpperCase().includes('S.R.L.');
          const formattedDate = new Date(v.fecha).toLocaleDateString('es-PE', { 
            day: '2-digit', month: '2-digit', year: 'numeric' 
          }) + ' ' + new Date(v.fecha).toLocaleTimeString('es-PE', { 
            hour: '2-digit', minute: '2-digit' 
          });

          const productosStr = v.items && v.items.length > 0 
            ? v.items.map(i => `${i.cantidad}x ${i.descripcion}`).join(', ') 
            : 'Productos varios';

          return {
            id: v.id,
            dbId: v.id,
            tipo: isFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA',
            fecha: formattedDate,
            rawFecha: v.fecha,
            nro: v.numero,
            razonSocial: v.cliente_nombre,
            productos: productosStr,
            metodoPago: v.metodo_pago || 'Efectivo',
            estado: v.estado === 'Completada' ? 'CANCELADO' : 'PENDIENTE',
            total: v.total,
            saldo: v.estado === 'Completada' ? 0 : v.total,
            pagado: v.estado === 'Completada' ? v.total : 0
          };
        });

        // Combinar comprobantes de Supabase y locales evitando duplicaciones
        const map = new Map<string, ItemEstadoCuenta>();
        cuentaDB.forEach(item => {
          map.set(item.nro, item);
        });

        mapped.forEach(item => {
          if (map.has(item.nro)) return;

          // Si es una orden y ya existe una factura para este cliente y total, no duplicar
          const hasIssuedInvoice = Array.from(map.values()).some(existing => 
            existing.razonSocial.trim().toLowerCase() === item.razonSocial.trim().toLowerCase() &&
            Math.abs(existing.total - item.total) < 0.01
          );

          if (!hasIssuedInvoice) {
            map.set(item.nro, item);
          }
        });

        setAllData(Array.from(map.values()));
      } catch (err) {
        console.error('Error al cargar estado de cuenta:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRealVentas();
  }, []);

  const handleOpenCobroModal = (item: ItemEstadoCuenta) => {
    setCobroModalItem(item);
    setCobroAmount(item.saldo);
    setPaymentMethod(item.metodoPago || 'Efectivo');
    setNroOperacion('');
  };

  const handleConfirmCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cobroModalItem || cobroAmount <= 0) return;

    setIsProcessingCobro(true);

    try {
      const nuevoSaldo = Math.max(0, Number((cobroModalItem.saldo - cobroAmount).toFixed(2)));
      const nuevoPagado = Number((cobroModalItem.pagado + cobroAmount).toFixed(2));
      const nuevoEstado = nuevoSaldo === 0 ? 'CANCELADO' : 'PENDIENTE';

      // 1. Actualizar estado local
      const updatedAllData = allData.map(d => {
        if (d.nro === cobroModalItem.nro) {
          return {
            ...d,
            metodoPago: paymentMethod,
            saldo: nuevoSaldo,
            pagado: nuevoPagado,
            estado: nuevoEstado
          };
        }
        return d;
      });
      setAllData(updatedAllData);

      // 2. Actualizar localStorage
      const cachedCuenta = localStorage.getItem('erp_estado_cuenta');
      const cuentaDB: ItemEstadoCuenta[] = cachedCuenta ? JSON.parse(cachedCuenta) : [];
      let foundInCached = false;
      const updatedCuentaDB = cuentaDB.map(d => {
        if (d.nro === cobroModalItem.nro) {
          foundInCached = true;
          return {
            ...d,
            metodoPago: paymentMethod,
            saldo: nuevoSaldo,
            pagado: nuevoPagado,
            estado: nuevoEstado
          };
        }
        return d;
      });
      if (!foundInCached) {
        updatedCuentaDB.push({
          ...cobroModalItem,
          metodoPago: paymentMethod,
          saldo: nuevoSaldo,
          pagado: nuevoPagado,
          estado: nuevoEstado
        });
      }
      localStorage.setItem('erp_estado_cuenta', JSON.stringify(updatedCuentaDB));

      // 3. Sincronizar con Supabase si aplica
      if (nuevoEstado === 'CANCELADO') {
        try {
          if (cobroModalItem.dbId) {
            await supabase.from('ventas').update({ estado: 'Completada', metodo_pago: paymentMethod }).eq('id', cobroModalItem.dbId);
          } else {
            await supabase.from('ventas').update({ estado: 'Completada', metodo_pago: paymentMethod }).eq('numero', cobroModalItem.nro);
          }
        } catch (dbErr) {
          console.warn('No se pudo actualizar en Supabase ventas:', dbErr);
        }
      }

      setToastMessage(`¡Cobro de S/ ${cobroAmount.toFixed(2)} registrado con éxito! El documento ${cobroModalItem.nro} ahora está ${nuevoEstado}.`);
      setTimeout(() => setToastMessage(null), 5000);
      setCobroModalItem(null);
    } catch (err) {
      console.error('Error al registrar cobro:', err);
    } finally {
      setIsProcessingCobro(false);
    }
  };

  // Filtramos la data en tiempo real
  const filteredData = useMemo(() => {
    return allData.filter(d => {
      const matchText = 
        d.razonSocial.toLowerCase().includes(filterText.toLowerCase().trim()) ||
        d.nro.toLowerCase().includes(filterText.toLowerCase().trim()) ||
        d.metodoPago.toLowerCase().includes(filterText.toLowerCase().trim()) ||
        d.productos.toLowerCase().includes(filterText.toLowerCase().trim());

      if (!matchText) return false;

      if (dateStart && d.rawFecha) {
        const itemDate = d.rawFecha.slice(0, 10);
        if (itemDate < dateStart) return false;
      }
      if (dateEnd && d.rawFecha) {
        const itemDate = d.rawFecha.slice(0, 10);
        if (itemDate > dateEnd) return false;
      }

      return true;
    });
  }, [allData, filterText, dateStart, dateEnd]);

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
    const headers = ['Tipo', 'Fecha Venta', 'Nro Documento', 'Razón Social', 'Detalle de Productos', 'Forma de Pago', 'Estado', 'Total S/.', 'Saldo S/.', 'Pagado S/.'];
    let csvContent = headers.join(';') + '\n';
    
    filteredData.forEach(item => {
      const row = [
        item.tipo,
        item.fecha,
        item.nro,
        `"${item.razonSocial}"`,
        `"${item.productos}"`,
        item.metodoPago,
        item.estado,
        item.total,
        item.saldo,
        item.pagado
      ];
      csvContent += row.join(';') + '\n';
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
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
                  <th className="px-3 py-2 first:rounded-l-lg">Fecha Venta</th>
                  <th className="px-3 py-2">Nro Documento</th>
                  <th className="px-3 py-2">Razón Social</th>
                  <th className="px-3 py-2">Detalle de Productos</th>
                  <th className="px-3 py-2">Forma de Pago</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-right">Total S/.</th>
                  <th className="px-3 py-2 text-right">Saldo S/.</th>
                  <th className="px-3 py-2 text-right">Pagado S/.</th>
                  <th className="px-3 py-2 text-center last:rounded-r-lg print:hidden">Acción</th>
                </tr>
              </thead>
              
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          Cargando documentos de ventas desde Supabase...
                        </p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : Object.keys(groupedData).length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={10} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <FileBarChart size={38} className="mb-3 text-slate-400 opacity-60" />
                        <h4 className={`text-sm font-bold mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          {filterText ? `No se encontraron documentos para "${filterText}"` : 'No se encontraron documentos'}
                        </h4>
                        <p className={`text-xs leading-relaxed mb-4 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          {filterText 
                            ? 'Verifica que el nombre o documento corresponda a un Cliente con ventas facturadas en el rango de fechas seleccionado.'
                            : 'Genera una orden en "Ventas > Orden de venta" y emite el comprobante en "Facturación" para visualizar el estado de cuenta aquí.'}
                        </p>
                        <div className={`p-3 rounded-xl border text-[11px] text-left leading-relaxed ${
                          darkMode ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-blue-50/70 border-blue-200 text-blue-900'
                        }`}>
                          <p className="font-semibold mb-1">💡 ¿Buscabas un Proveedor?</p>
                          <p>
                            Los proveedores registrados (como Jordan Rojas) pertenecen al flujo de <strong>Compras</strong>. Para consultar sus datos u órdenes dirígete a <strong>Compras &gt; Orden de Compra</strong>. Si deseas registrar ventas a nombre de Jordan, debes darlo de alta en <strong>Ventas &gt; Clientes</strong>.
                          </p>
                        </div>
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
                        <td colSpan={10} className="p-0 pt-3 print:pt-0">
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
                          <td className={`px-3 py-2.5 font-semibold text-xs print:text-black whitespace-nowrap ${
                            darkMode ? 'text-slate-300' : 'text-slate-700'
                          }`}>
                            {item.metodoPago}
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
                          <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${
                            item.pagado > 0 ? (darkMode ? 'text-emerald-400' : 'text-emerald-600') : (darkMode ? 'text-slate-500' : 'text-slate-400')
                          } print:text-black`}>
                            {formatCurrency(item.pagado)}
                          </td>
                          <td className="px-3 py-2.5 text-center rounded-r-xl print:rounded-none print:hidden whitespace-nowrap">
                            {item.saldo > 0 || item.estado === 'PENDIENTE' ? (
                              <button
                                onClick={() => handleOpenCobroModal(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all hover:scale-105 active:scale-95"
                                title="Registrar cobro de este documento"
                              >
                                <Coins size={13} />
                                Cobrar
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={13} />
                                Cobrado
                              </span>
                            )}
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
                        <td className="print:hidden"></td>
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
                    placeholder="Cliente, documento o forma de pago"
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
                  const count = filteredData.length;
                  if (filterText.trim()) {
                    setConsultFeedback(`Consulta: ${count} documento(s) para "${filterText}".`);
                  } else {
                    setConsultFeedback(`Consulta: ${count} documento(s) en el período actual.`);
                  }
                  setTimeout(() => setConsultFeedback(null), 4000);
                }}
                className="w-full mt-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm active:scale-[0.98]"
              >
                Consultar
              </button>

              {consultFeedback && (
                <div className={`text-xs p-2.5 rounded-lg border text-center transition-all ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-800'
                }`}>
                  {consultFeedback}
                </div>
              )}
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl border border-emerald-500 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={18} />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Modal de Cobro */}
      {cobroModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Registrar Cobro de Venta</h3>
                  <p className="text-[11px] text-slate-400">Documento {cobroModalItem.nro}</p>
                </div>
              </div>
              <button 
                onClick={() => setCobroModalItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmCobro} className="mt-4 space-y-4">
              {/* Resumen del documento */}
              <div className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                darkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Cliente:</span>
                  <span className="font-bold truncate max-w-[220px]">{cobroModalItem.razonSocial}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Total Documento:</span>
                  <span className="font-bold">S/ {formatCurrency(cobroModalItem.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Monto ya Pagado:</span>
                  <span className="font-bold text-emerald-500">S/ {formatCurrency(cobroModalItem.pagado)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t dark:border-slate-700">
                  <span className="font-bold text-orange-500">Saldo Pendiente:</span>
                  <span className="font-extrabold text-orange-500 text-sm">S/ {formatCurrency(cobroModalItem.saldo)}</span>
                </div>
              </div>

              {/* Monto a Cobrar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Monto a Cobrar (S/):
                  </label>
                  <button
                    type="button"
                    onClick={() => setCobroAmount(cobroModalItem.saldo)}
                    className="text-[11px] font-bold text-sky-500 hover:underline"
                  >
                    Cobrar Saldo Total
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={cobroModalItem.saldo}
                    value={cobroAmount}
                    onChange={(e) => setCobroAmount(Number(e.target.value))}
                    required
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Forma de Pago */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Forma de Pago:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria (BCP / BBVA / Interbank)</option>
                  <option value="Yape / Plin">Yape / Plin</option>
                  <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                </select>
              </div>

              {/* Nro de Operación Opcional */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nro de Operación / Referencia (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: OPE-839201 o Yape 987654321"
                  value={nroOperacion}
                  onChange={(e) => setNroOperacion(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCobroModalItem(null)}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors border ${
                    darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingCobro || cobroAmount <= 0}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessingCobro ? (
                    <span>Procesando...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Confirmar Cobro
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
