# Fase 2: órdenes de compra

Se revisó FASE_1_PANEL.md y el contrato actual de IngresoKardexPage. Esta fase conserva autenticación, panel, facturación y recepción existentes. No se ejecutó SQL remoto, migración a Supabase, despliegue ni push. No se leyó ni modificó .env.local.

## Implementación y archivos

- `frontend/src/modules/compras/OrdenCompraPage.tsx`: proveedores reales, selección explícita del catálogo, edición de cantidad/precio, validaciones, resumen, Nueva compra, bloqueo durante guardado y confirmación con acceso a Ingreso al Kardex. Se conserva el diseño de tarjetas y colores, modo oscuro y distribución responsive.
- `frontend/src/modules/compras/purchaseOrder.ts`: cálculos, validación, snapshots, ID de borrador, lectura de catálogo sin escrituras y persistencia con respaldo/idempotencia.
- `frontend/src/services/proveedoresService.ts`: opción `getProveedores({ initializeIfEmpty: false })`. Compras obtiene los proveedores desde este servicio sin crear ejemplos cuando no hay registros. El comportamiento predeterminado usado por otros módulos permanece igual.
- `frontend/tests/purchaseOrder.test.mjs`: pruebas de los contratos y operaciones de esta fase.

## Datos y validación

El proveedor debe existir, estar Activo y tener nombre/documento válidos. Se acepta DNI de 8 dígitos o RUC de 11 en persona natural y RUC de 11 en jurídica: es validación de formato, sin consulta remota. Dirección, correo, teléfono y condición de pago se muestran según la fuente; ausencias se identifican como no registradas y en el snapshot quedan null. Condición 0 significa contado. El selector muestra el estado real y bloquea proveedores incompletos/inactivos.

La búsqueda de producto filtra el catálogo; no elige arbitrariamente la primera coincidencia. Debe seleccionarse un producto por ID. No se generan productos GEN-001 ni precios ficticios. Se sugiere el costo registrado cuando es positivo, siempre editable. El mismo producto se agrega una vez y su cantidad se edita en la tabla.

Cantidad y precio deben ser numéricos, finitos y mayores que cero. El descuento global es un importe PEN, opcional (vacío = cero), no negativo y no puede superar el subtotal. Se conserva la regla anterior: subtotal = suma de cantidad × precio; base imponible = subtotal − descuento; IGV = base × 18%; total = base + IGV. No se introdujeron cambios de tasa, tipo de cambio o redondeo comercial. Los campos inválidos no se convierten silenciosamente en cero.

Antes de guardar se relee la fuente de proveedores y el catálogo. Un proveedor desactivado/eliminado, datos cambiados o un producto inexistente impiden guardar; los campos permanecen para corrección/reintento. Puede actualizarse la fuente al abrir el selector de proveedor o iniciar Nueva compra.

## Persistencia y compatibilidad

La clave sigue siendo `erp_ordenes_compra`. Cada orden nueva conserva:

- `id` estable OC-año-UUID para ese borrador, utilizado como referencia futura de movimientos.
- `proveedor`, `ruc` (vacío para DNI), `documento`, `proveedor_id` y `proveedor_datos` con una copia de identificación, contacto y condiciones.
- `items` con código, descripción, unidad, cantidad, precioUnitario e importe; además producto_id y producto_datos descriptivos históricos.
- Fecha ISO, moneda PEN, subtotal antes del descuento, descuento, baseImponible, IGV y total.
- Estado `Pendiente de ingreso al Kardex` y una firma del contenido para reconocer reintentos del mismo borrador.

Se mantienen los campos que consume el selector actual de IngresoKardexPage (`id`, `proveedor`, `items.codigo`, `descripcion`, `unidad`, `cantidad`, `precioUnitario`, `importe`). Los registros antiguos, estados y campos adicionales se conservan al agregar la nueva orden, sin transformaciones automáticas. No se modificó IngresoKardexPage: elegir/recibir, filtrar pendientes y usar proveedor_id/producto_id de forma preferente corresponden a la fase 3. El selector actual busca productos por código/descripción y proveedores por nombre; cambios posteriores de esos datos o nombres ambiguos necesitan la adaptación de recepción, sin alterar los snapshots guardados.

No se llama a registrarMovimiento ni se escribe en productos o Kardex al abrir/guardar la compra. Se retiró la actualización del cache auxiliar erp_dashboard_data, que ya no usa el panel: fase 1 calcula compras directamente desde órdenes.

## Respaldo y duplicados

Antes de escribir la colección se guarda el snapshot comercial existente en una clave nueva `erp_respaldo_compra_<id>_<fecha>_<uuid>`. Si falla el respaldo, no se escribe la orden. El botón Descargar respaldo de fase 1 también incluye compras y proveedores; se recomienda usarlo antes de probar.

Solo hay una escritura comercial, a la colección de órdenes; una escritura localStorage fallida no cambia su valor previo. No se borran registros, no se reemplazan por ejemplos y no se modifica el stock. No se ejecutaron operaciones sobre el localStorage real del usuario desde las herramientas: el mecanismo se comprobó con almacenamiento simulado.

El bloqueo inmediato por ref evita doble clic incluso antes de que React actualice los botones; el ID no cambia ante errores. Si ese ID ya existe con la misma firma, el reintento devuelve la orden existente sin agregar otra ni repetir respaldos. Si su contenido difiere, se rechaza la reutilización. Se prueba también una respuesta incierta después de haberse escrito: el reintento conserva una sola orden.

Después de guardar se mantiene el formulario como consulta, bloqueado contra nuevos guardados; Nueva compra inicia otro ID y limpia solo memoria. Si hay cambios sin guardar, pide confirmación; Cancelar conserva el borrador. No se mantienen borradores entre recargas ni se implementa una transacción para múltiples pestañas concurrentes. No se borran automáticamente respaldos.

## Verificación

30 pruebas automatizadas aprobadas: 18 previas y 12 de compras. Cobertura de fuente real de proveedores sin escrituras, ausencias, identificación, cálculos/edición, importes inválidos, catálogo sin normalización, conservación de registros antiguos, contrato de líneas para Kardex, snapshots, proveedor/producto cambiado, doble guardado/reintento y fallos de respaldo/escritura. Se comprueba que stock, Kardex y cache permanecen idénticos al guardar. Las pruebas anteriores de autenticación y fase 1 siguen pasando.

Build correcto; advertencia de tamaño de bundle. Lint sin errores, con advertencias en módulos existentes. No hay navegador automatizado disponible en las herramientas ni Playwright/Puppeteer instalado. No se hicieron pruebas visuales ni flujos de autenticación reales. No se desactivó la autenticación. La recepción completa no se declara verificada por estas pruebas de contrato.

## Prueba manual

1. Desde frontend ejecutar `npm.cmd run dev`, autenticarse con la configuración existente y descargar el respaldo desde Resumen general.
2. Abrir Orden de compra. Buscar un proveedor registrado: verificar documento, dirección, contacto, plazo y estado. Probar uno inactivo y una búsqueda vacía. Si no hay registros, no se generan ejemplos nuevos desde esta página.
3. Buscar y seleccionar un producto, revisar el costo sugerido, ingresar cantidad y precio, agregarlo. Cambiar ambos valores en la tabla y comprobar subtotal, descuento, IGV y total.
4. Probar cero/negativos/campos vacíos, descuento mayor que subtotal y guardar sin proveedor o sin líneas: debe bloquearse con aviso. Corregir y conservar los campos. Agregar dos veces el mismo producto debe pedir editar la línea existente.
5. Con datos sin guardar, pulsar Nueva compra y Cancelar: el formulario debe conservarse. Aceptar: se limpia, sin cambiar órdenes guardadas.
6. Guardar y probar doble clic. Debe quedar una sola orden con ID estable y confirmación. Revisar que stock y movimientos no cambian. Usar Ir a Ingreso al Kardex, seleccionar la orden y comprobar todas sus líneas; no confirmar recepción como parte de esta fase.
7. Comprobar también una orden antigua en el selector y que sus campos históricos se mantienen. No se cambió el flujo de recepción.
8. Volver a Resumen general, elegir la fecha de la compra y actualizar: debe aparecer su total una sola vez en PEN. Repetir las comprobaciones manuales de PDF/CSV, periodos, existencias y facturación descritas en FASE_1_PANEL.md.
9. Revisar móvil y modo oscuro. Si el login bloquea el acceso, revisar variables públicas, confirmación de correo y perfiles/roles según supabase/README.md; no desactivar controles para realizar la prueba.

## Pendientes

Fase 3: recepción consistente, pendientes, idempotencia de inventario, vínculo de movimientos y redirección/filtro. Fases 4 a 6 no iniciadas. Los datos comerciales continúan compartidos por navegador; no están aislados por empresa.
