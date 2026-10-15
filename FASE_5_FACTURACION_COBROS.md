# Fase 5: comprobantes locales y cobros

Se conservan autenticación y fases 1–3. APIAMIGO permanece pendiente del enlace oficial; no se sustituyeron ni eliminaron consultas actuales. No se ejecutó SQL remoto, despliegue, push ni cambios de configuración de Supabase. No se leyó ni modificó .env.local.

## Revisión de fuentes

OrdenVentaPage guarda cliente/RUC seleccionados, descripciones, cantidades, precios unitarios e importes de líneas, total, fecha y vendedor genérico. Su selector de clientes todavía contiene datos de demostración; esta fase no inventa otros datos ni atribuye una identidad distinta a una orden histórica. El usuario debe revisar que la operación registrada corresponda a su cliente real. La factura toma los datos guardados en la orden, sin buscarlos por coincidencias parciales en otro cliente o empresa. Si falta identificación o los importes son inconsistentes, se bloquea la emisión.

Las órdenes conectadas anteriores no guardaban dirección del cliente, moneda explícita, subtotal o IGV. Se conserva una dirección ausente como no registrada. Moneda ausente se interpreta en PEN porque el formulario original operaba en soles; no se convierte ninguna moneda. Se admiten PEN y USD explícitos.

El subtotal se calcula desde las líneas conservadas y se verifica el total de la orden contra esa base e IGV del 18 %, con centavos y redondeo decimal. No se altera una orden cuyo importe no concuerda: se informa para revisarla. El usuario registrador procede del correo real de la sesión, en lugar del texto genérico Vendedor Actual.

## Emisor y alcance del administrador

Clientes: se usa únicamente auth.company, la empresa propia ya validada durante autenticación. Si falta RUC de 11 dígitos, razón social o dirección fiscal, no se permite emitir.

Administrador sin empresa en el contexto de Auth: Facturación muestra Configuración de emisor local de esta cuenta. El usuario debe declarar explícitamente RUC, razón social y dirección de la empresa a la que representa. Se guarda en `erp_emisor_local_<userId>` y se respalda antes de sustituir una configuración anterior. No se consulta una empresa ajena ni se asigna automáticamente la primera empresa del sistema. La configuración no verifica titularidad/RUC ante SUNAT ni crea una empresa remota. Puede editarse sin alterar comprobantes ya guardados. Es una configuración local por cuenta, no aislamiento ni autorización multiempresa para datos comerciales.

Este mecanismo evita cambiar las políticas RLS existentes, que no permiten al administrador registrar empresas mediante el formulario público de clientes. No se elevan roles ni se amplía acceso a otras empresas. Una configuración de emisor empresarial gestionada en servidor queda fuera de esta entrega.

## Emisión e impresión

- Se emiten COMPROBANTES LOCALES, numerados LOC-000001, etc., dentro de los datos de este navegador. No son correlativos de SUNAT ni comprobantes electrónicos autorizados. Se retiraron las afirmaciones de validez contable/electrónica y los números/horarios ficticios de la impresión.
- Cada comprobante conserva emisor, cliente, productos, moneda, subtotal, IGV, total, usuario registrador, fecha real de emisión, fecha original de operación y vínculo con la orden. La copia guardada no se reconstruye a partir de catálogos actuales.
- La orden permanece como Facturada, con su referencia de comprobante. El panel cuenta la orden una sola vez y no añade su comprobante vinculado como otra venta. La emisión no llama a inventario ni genera otra salida.
- El botón de emisión tiene bloqueo inmediato por ref y se ejecuta dentro del bloqueo de facturación. El ID de solicitud reconoce reintentos; otra solicitud para la misma orden facturada se rechaza.
- La bandeja permite seleccionar pendientes o emitidos. El botón Imprimir se habilita únicamente con un comprobante emitido seleccionado. InvoiceDocument es la misma vista para pantalla e impresión: no construye otro número, otro cliente ni una hora fija. Los registros antiguos sin datos del emisor o productos detallados muestran esa ausencia; no se rellenan con la empresa actual. Sus campos históricos almacenados no se reescriben.

## Cobros, redondeo y registros anteriores

- Acción Cobrar por documento pendiente y Ver pagos para cancelados. El formulario incluye documento, cliente, moneda, total, saldo, importe, fecha, medio y referencia opcional; ofrece usar el saldo completo.
- Se rechazan valores no numéricos, vacíos, cero, negativos, fuera de rango y superiores al saldo, así como moneda distinta, fecha inválida o medio desconocido. El guardado relee el documento y su saldo actual, sin confiar en el saldo de la pantalla.
- Política monetaria: importes no negativos se convierten de decimal a centavos enteros con redondeo half-up a dos decimales; pagos y saldos se calculan como enteros. Un pago positivo que redondea a cero se rechaza. Un importe nominal superior al saldo se rechaza incluso si redondearía al mismo centavo. Las sumas deben mantenerse en el rango entero seguro de JavaScript.
- El pago queda identificado con UUID estable, importe en centavos y moneda, fecha indicada, medio, referencia y fecha real de registro. No hay borrado de pagos ni reinicio de saldos. Pagado/saldo/estado se actualizan en la misma escritura de colección: PARCIAL o CANCELADO.
- El mismo ID/contenido devuelve el resultado existente, sin aplicar otro pago; reutilizar el ID con datos diferentes se rechaza. Durante el guardado no se puede cerrar el diálogo ni confirmar otra vez. Tras un parcial se debe iniciar explícitamente otro pago o reabrir el documento.
- Registros antiguos pagados sin historial: se conserva el importe previo como antecedente identificado, no como pago ficticio. Al primer cobro se guardan también los valores originales y ese antecedente; solo el pago nuevo entra en el historial. Los registros que no se cobran no se transforman automáticamente.
- Si total/pagado/saldo o historial no concuerdan, no se corrigen por suposición: se bloquea el cobro y se informa. Números históricos duplicados sin ID inequívoco también requieren revisión manual. No se asocia un pago arbitrariamente al primer registro encontrado.

## Vista, filtros y exportación

El estado de cuenta parte sin límites de fecha, por lo que muestra también operaciones recientes. Los controles de fecha funcionan para fechas ISO y formatos antiguos es-PE; un rango invertido avisa y no devuelve filas. La búsqueda, tabla, resumen, CSV e impresión comparten el mismo conjunto filtrado. Hay selector PEN/USD y no se suman monedas distintas ni se convierte implícitamente.

Los pagos actualizan inmediatamente documento, tabla y resumen. Tabla/impresión muestran pagos y antecedentes; CSV incluye fechas/rango, moneda, búsqueda, importes actuales, antecedente e historial con IDs. El formato exportado es decimal en la moneda indicada y respeta los mismos centavos del cálculo. Cobrar modifica solo erp_estado_cuenta: no aumenta ventas, no cambia órdenes ni afecta stock o Kardex. El panel mostrará el nuevo saldo al volver o pulsar Actualizar.

## Respaldo y recuperación

Se reutiliza commercialSnapshot y el patrón de recuperación de fase 3. Antes de cada emisión/cobro se guarda una copia original en `erp_respaldo_facturacion_*` o `erp_respaldo_cobro_*`. La configuración del emisor tiene su respaldo específico `erp_respaldo_emisor_*` con su valor anterior.

`erp_facturacion_transaccion` registra imágenes anteriores/posteriores. Ante fallo se revierte el conjunto; ante reversión fallida, el journal conserva información y bloquea nuevas operaciones hasta Actualizar / recuperar. En la siguiente carga se revierte una operación preparada o se comprueba/limpia una confirmada. Si hay cambios inesperados, la recuperación se bloquea para revisión del respaldo; no sobrescribe datos ajenos. El panel también evita leer fuentes financieras con un journal pendiente. No se borran respaldos ni todo localStorage.

Web Locks serializa emisiones/cobros de estas pantallas cuando está disponible. No se convierte localStorage en una base de datos transaccional: sin ese soporte no hay aislamiento entre pestañas, y los flujos antiguos/ediciones externas del almacenamiento no participan de ese bloqueo. No operar en otras pestañas si aparece un error de recuperación. Los datos comerciales siguen compartidos por navegador, sin aislamiento por empresa.

## Archivos

- `frontend/src/services/billing.ts`: importes, datos de emisión, emisor local, cobros, filtros y exportación.
- `frontend/src/services/billingTransaction.ts`: respaldo, bloqueo, commit/reversión y recuperación.
- `frontend/src/services/invoicePersistence.ts`: conservación de orden/comprobante con el journal financiero.
- `frontend/src/modules/ventas/FacturacionPage.tsx`, `InvoiceDocument.tsx`: bandeja, emisor, emisión y vista única de impresión.
- `frontend/src/modules/ventas/EstadoCuentaPage.tsx`, `PaymentDialog.tsx`: filtros, tabla, resumen, formulario e historial.
- `frontend/src/modules/dashboard/dashboardAnalytics.ts`: bloqueo de lectura durante recuperación financiera, sin cambiar las fórmulas del panel.
- `frontend/tests/billing.test.mjs`: pruebas de esta fase.

## Verificación

56 pruebas aprobadas: 42 previas y 14 nuevas. Se cubren emisor obligatorio y separado por cuenta, snapshot de emisión, duplicados/reintentos, stock e historial sin cambios, pagos parciales/finales, sobrepago, datos inválidos, centavos sin residuos, antecedente antiguo, fallos de respaldo/escritura/commit y recuperación, documentos inconsistentes/duplicados, filtros, monedas, CSV actualizado y contenido del componente de impresión.

El test de impresión renderiza el componente React real en servidor y comprueba número/datos del snapshot; no equivale a abrir el diálogo de impresión ni verificar visualmente páginas en un navegador. No hay navegador automatizado disponible ni Playwright/Puppeteer instalado; los flujos reales con login, presentación móvil/modo oscuro y la impresión física quedan pendientes.

Build correcto con advertencia de bundle grande; lint sin errores, con advertencias en módulos anteriores. No se realizaron consultas APIAMIGO ni operaciones remotas de autenticación o negocio.

## Prueba manual concreta

1. Ejecutar `npm.cmd run dev` desde frontend, autenticarse y descargar el respaldo comercial del panel.
2. Con cliente, comprobar que el emisor corresponde a su empresa propia. Con administrador sin empresa, seleccionar una orden: debe bloquear la emisión hasta guardar su emisor local declarado; no usar datos ajenos.
3. Seleccionar una orden con identificación e importes coherentes; revisar emisor, cliente, productos, moneda y total. Registrar con doble clic: debe quedar un único comprobante, la orden conservarse y el stock/Kardex permanecer iguales.
4. Seleccionar el comprobante en Emitidos e imprimir. Comprobar mismo número LOC, emisor, cliente, líneas, moneda y total; sin F002 construido ni hora fija ni afirmación de validación SUNAT. Revisar también un registro histórico incompleto: debe mostrar lo que falta, no datos actuales inventados.
5. Abrir Estado de cuenta, elegir moneda, fechas y búsqueda. Pulsar Cobrar; registrar parcial con fecha/medio/referencia y comprobar pagado/saldo/estado, historial y resumen actualizados.
6. Intentar cero, negativo, texto, sobrepago y doble clic. No deben alterar los registros indebidamente. Registrar el saldo final y comprobar saldo exactamente cero y estado CANCELADO.
7. En un comprobante antiguo ya parcialmente pagado, comprobar el antecedente identificado y que solo los nuevos pagos tienen historial. No forzar pruebas de corrupción/fallos en datos reales: se cubren con almacenamiento simulado.
8. Exportar CSV e imprimir con filtros: deben coincidir filas, moneda, pagos, antecedentes y totales. Volver al panel: ventas deben mantenerse y deuda reducirse, sin otro movimiento de inventario.
9. Revisar móvil y modo oscuro. Si Auth impide acceso, resolver su configuración sin desactivar la protección.

Fase 4 sigue pendiente del enlace oficial; fase 6 y los pendientes de alertas/stock no se implementaron aquí.
