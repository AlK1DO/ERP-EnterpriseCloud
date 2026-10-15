# Fase 1: revisión y resumen general

Se preservaron la autenticación y los cambios previos. No se modificó configuración de entorno ni se ejecutaron operaciones remotas. Solo se ejecuta la fase 1; fases 2 a 6 pendientes.

## Revisión del código y relaciones

| Área | Archivos y fuente de datos | Hallazgo comprobado |
|---|---|---|
| Panel | `DashboardPage.tsx`, órdenes, estado de cuenta, productos y movimientos | Antes sumaba órdenes sin filtro de fechas, distribuía ventas semanales con porcentajes fijos y mostraba crecimiento ficticio. |
| Compra | `OrdenCompraPage.tsx`, `erp_ordenes_compra` | Proveedores fijos separados de `proveedoresService`; guarda detalle y no aumenta stock. Actualiza además un cache de dashboard que el panel ya no usa. |
| Proveedores | `proveedoresService.ts`, `erp_enterprise_proveedores` | Fuente persistente con documento, contacto, dirección y condición de pago; no está conectada al selector de compra. |
| Recepción | `IngresoKardexPage.tsx`, órdenes y `inventarioService` | Ya importa todas las líneas de una orden. Confirma movimientos uno por uno y marca la orden después; no hay transacción de recepción completa. No se encontró un modelo de cantidades parcialmente recibidas. |
| Movimientos | `MovimientoKardexPage.tsx`, `erp_kardex_movimientos` | Consulta historial y registra salidas manuales. La recepción no redirige aquí ni aplica un filtro de recepción. |
| Venta | `OrdenVentaPage.tsx`, `erp_ordenes_venta` | Descuenta inventario y guarda orden. Las fechas son textos es-PE y sus importes se presentan en soles, sin campo moneda. El ID guardado difiere del generado para los movimientos; pendiente de otro alcance. |
| Facturación | `FacturacionPage.tsx`, órdenes y `erp_estado_cuenta` | Eliminaba la orden al emitir: hacía caer ventas del panel. Se corrigió exclusivamente conservación y vínculo de operación. Datos de emisor, comprobante local y demás correcciones siguen pendientes de fase 5. |
| Cuenta | `EstadoCuentaPage.tsx`, `erp_estado_cuenta` | Usa saldo/pagado sin historial de pagos. Los campos de fechas no intervienen en el filtrado. Pendiente de fase 5. |
| Stock | `StockProductosPage.tsx`, `inventarioService.ts`, `erp_products_db` | La edición de la página no envía cambios de stock, aunque el servicio acepta campos parciales. Crear con stock inicial ya lo asigna y después registra otra entrada: duplicación confirmada en código, pendiente de fase 6. |

El panel no incorpora `erp_enterprise_ventas`: es una colección del módulo alternativo VentasPage, que sigue sin ruta; no se presume que sean operaciones distintas de las órdenes conectadas. No se mezclaron fuentes que pudieran duplicar operaciones.

## Cambios de fase 1

- Título Resumen general. Un selector compartido semanal (lunes-domingo), mensual o anual y una fecha de referencia; los dos gráficos temporales usan ese mismo rango.
- Fechas por operación, agrupadas por día en semana/mes y por mes en año. ISO se interpreta en America/Lima; también se reconocen los formatos es-PE guardados por el código anterior. Se excluyen fechas/importes inválidos con aviso.
- Filtro PEN/USD sin conversión. Los registros antiguos sin moneda se interpretan en PEN porque los formularios conectados originales registran importes en soles; la interfaz y exportaciones lo advierten. No se deduce un tipo de cambio.
- Ventas incluyen IGV; compras mide órdenes emitidas, no desembolsos. Diferencia ventas menos compras es un importe, no margen bruto. No hay costo de ventas fiable para calcularlo.
- Saldos pendientes y stock crítico representan el estado actual, no balances históricos del periodo.
- Según la aclaración del usuario, Existencias por categoría a precio de venta suma stock × precio de venta por categoría. El denominador es la suma de esos valores actuales; no cambia por fecha, periodo ni moneda del análisis comercial. Se expresa en PEN y no representa ventas ni costo. Total cero muestra sin datos y no produce porcentajes inválidos.
- PDF y CSV independientes del resumen, comparación, ventas y existencias; las exportaciones comparten las tablas de datos de los cálculos, con título, rango/alcance, moneda y notas.
- El panel es de solo lectura: no llama a getProductos (que normaliza/escribe), no crea productos de ejemplo y no reemplaza datos inválidos.

### Corrección mínima al facturar

La orden se conserva en `erp_ordenes_venta` con estado Facturada y comprobante_nro; desaparece solo del selector pendiente. El comprobante guarda orden_id, fecha_operacion y moneda. El panel cuenta la orden y omite su comprobante vinculado como venta adicional. No cambia el stock al facturar.

Los comprobantes históricos cuya orden ya se eliminó se contabilizan por su fecha de emisión. No hay datos para reconstruir su fecha original de venta ni asociarlos con certeza a otras órdenes. Se advierte esa limitación y no se inventan vínculos ni se reescribe historia.

## Respaldo y conservación

Antes de cada cambio de persistencia de facturación se guarda una copia de valores originales, sin alterar su formato, en una clave nueva `erp_respaldo_facturacion_<fecha>_<id>`. Si falla ese respaldo, no se cambia ninguna colección comercial. Ante un error de escritura posterior se intenta restaurar los valores anteriores y se muestra el resultado. No es una transacción resistente a cierre abrupto del navegador o escrituras concurrentes desde pestañas distintas; queda el respaldo para recuperación. No se borra ni rota automáticamente ningún respaldo.

El botón Descargar respaldo del panel exporta las siete colecciones comerciales incluidas en `commercialBackup.ts` a JSON, incluyendo valores ausentes como null. No exporta sesiones Supabase, claves ni contraseñas. Descargarlo antes de probar facturación; conservar el archivo fuera del navegador. El mecanismo está preparado y probado con almacenamiento simulado: no se accedió al localStorage real del usuario desde las herramientas.

Para recuperar, detener operaciones y revisar el JSON del archivo o la clave de respaldo. Restaurar únicamente los valores comerciales afectados mediante un procedimiento explícito; no borrar todo localStorage ni tocar las claves de Auth. No se implementó importación automática para evitar sobrescribir datos actuales.

## Verificación local

`npm.cmd run test`: 18 pruebas aprobadas (7 de autenticación y 11 de esta fase). Cubren fechas, límites de periodos, monedas, anulación, periodos vacíos, importes inválidos, lectura sin escrituras, porcentaje/denominador, inventario independiente del periodo, exportación CSV y generación real de PDF, conservación de ventas tras facturar, reintentos y fallos simulados de respaldo/guardado con reversión.

`npm.cmd run build`: correcto; advertencia de tamaño de bundle. `npm.cmd run lint`: sin errores, advertencias en módulos existentes. No hay herramientas de navegador disponibles ni Playwright/Puppeteer instalados; no se comprobó visualmente la pantalla ni la descarga desde un navegador. Los tests de PDF validan contenido generado, no el resultado visual de cada página.

## Prueba manual

1. Iniciar con `cd frontend` y `npm.cmd run dev`; autenticarse mediante la configuración existente.
2. Descargar respaldo. Elegir una fecha con órdenes y alternar semanal/mensual/anual; comparar sumas con operaciones del rango. Elegir luego un periodo vacío.
3. Cambiar PEN/USD: no sumar monedas distintas. En datos antiguos sin moneda debe aparecer el aviso de interpretación en soles.
4. Descargar PDF y CSV de cada gráfico y resumen; comprobar título, rango, moneda e importes. Las existencias deben mantener valores al cambiar el periodo y sus archivos indicar inventario actual/PEN.
5. Con una orden pendiente, comprobar total de ventas del periodo, emitir una vez, volver al panel y Actualizar. El total debe conservarse, la orden debe seguir almacenada como Facturada y su comprobante vinculado aparecer en cuenta una sola vez.
6. Comprobar que la misma orden deja de estar pendiente y que el botón no permite repetir mientras procesa. Probar reintentos/fallos solo con datos de prueba y respaldo; los fallos de almacenamiento ya se cubren automáticamente.
7. Revisar presentación móvil y modo oscuro.

## Pendientes

Fase 2: proveedores y edición de líneas de compra. Fase 3: recepción consistente e idempotente con destino y filtro de Kardex. Fase 4: identificar APIAMIGO antes de integrar. Fase 5: datos reales del comprobante, denominación local, cobros e historial/filtros. Fase 6: stock inicial, referencias históricas y reglas de alertas; aclarar significado de desbalanceado.

Los datos comerciales continúan compartidos por navegador. No se migraron a Supabase ni se implementó aislamiento por empresa.
