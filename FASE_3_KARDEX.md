# Fase 3: recepción completa y navegación de Kardex

Se mantienen autenticación, fases 1 y 2, distribución, tarjetas y colores. No se leyó ni modificó .env.local, no se ejecutó SQL remoto, push ni despliegue. Fases 4 a 6 no iniciadas.

## Flujo implementado

1. En Datos del comprobante / origen aparece siempre Orden de compra pendiente. Cuando no hay órdenes, se informa y se ofrece Crear una compra. El ingreso manual sigue disponible.
2. Seleccionar una orden relee el almacenamiento y carga todas sus cantidades pendientes, costos y datos históricos del proveedor cuando están disponibles. No escribe stock ni movimientos. La tabla y Resumen del Ingreso se actualizan desde las mismas líneas.
3. La referencia de orden se muestra aparte. El tipo y número de documento de recepción quedan bajo control del usuario: no se copia el ID de orden como factura o guía. Se exige un número real antes de confirmar.
4. Para una orden, las líneas importadas no pueden quitarse ni mezclarse con productos manuales; se confirma todo lo pendiente. Al cambiar de origen se pide confirmación si se reemplaza detalle sin guardar.
5. Grabar Ingreso y Confirmar Ingreso a Almacén llaman al mismo manejador, con bloqueo inmediato por ref y botones deshabilitados durante el proceso. Comparten el ID estable del borrador, conservado ante error/reintento.
6. Al confirmar se abre `/movimiento-kardex?recepcion=<id>`; el filtro también se aplica a indicadores, tabla y CSV. Quitar filtro permite volver a todos los movimientos. La orden completada se retira solo de pendientes: permanece con sus líneas, proveedor histórico, fecha de recepción y referencia de recepción.

## Validaciones y cálculos

Antes de escribir se comprueban todas las líneas: producto inequívoco y existente, cantidades/costos positivos y finitos, stock y costo previos válidos, documento, almacén, operación y moneda PEN. No se agregan cantidades por defecto ni se sustituye un costo faltante por cero. Se vuelve a calcular qué está pendiente: si cambió desde la selección, se pide recargar la orden.

Se conserva el costo promedio ponderado: `(stock previo × costo previo + cantidad recibida × costo de entrada) / nuevo stock`. Todos los productos y movimientos se calculan primero en memoria. No se cambia la política previa de costo unitario de compra ni se reparte automáticamente el descuento global entre líneas. Tampoco se implementa inventario separado por almacén: se mantiene el modelo actual de stock por producto y almacén como dato del movimiento.

Cada movimiento nuevo conserva recepcion_id, orden_id y orden_linea_id además del documento real de recepción. Las órdenes nuevas usan producto_id; para las antiguas se resuelve por código exacto, sin búsquedas parciales arbitrarias. El proveedor proviene de su copia histórica; si una orden antigua carece de copia, solo se utiliza una coincidencia inequívoca de sus datos actuales o los datos que quedaron en la propia orden, sin inventar dirección/contacto.

## Consistencia, respaldo y reintentos

`receptionService.ts` reemplaza el bucle de registrarMovimiento de esta pantalla por un guardado de conjunto. Las claves comerciales siguen siendo erp_products_db, erp_kardex_movimientos y erp_ordenes_compra. El historial previo se conserva y no se sustituye por ejemplos.

Antes de modificar se crea `erp_respaldo_recepcion_<id>_<uuid>` con los valores originales. Después se escribe un journal `erp_recepcion_transaccion` con imágenes anterior/posterior. Si falla el respaldo o la preparación, no se cambian datos comerciales. Si falla una escritura posterior, se restauran las imágenes anteriores de todo el conjunto. Si la reversión también falla, el journal permanece y bloquea nuevas operaciones de inventario: Reintentar carga / recuperación intenta restaurar el estado anterior. Una interrupción con journal preparado se recupera igual al volver a estas pantallas. Un journal confirmado solo se elimina después de verificar el estado final; no revierte una recepción ya confirmada.

La recuperación verifica que los valores actuales correspondan a la imagen anterior o posterior. Si detecta otros cambios, se bloquea para revisión manual; no los sobrescribe. Las lecturas de inventario del panel y compras también rechazan un journal pendiente. Las funciones existentes del servicio de inventario bloquean sus lecturas/escrituras mientras ese journal exista. No se borra todo localStorage ni se rotan respaldos automáticamente.

Web Locks serializa recepciones y recuperaciones de estas pantallas entre pestañas cuando el navegador lo soporta. localStorage no ofrece una transacción real de base de datos: sin Web Locks se mantiene el bloqueo de pantalla y recuperación, pero no se garantiza aislamiento frente a pestañas concurrentes; tampoco frente a modificaciones externas directas del almacenamiento o flujos históricos que ya hubieran leído antes. No continuar otros movimientos si hay un error de recuperación.

Un reintento con el mismo ID y contenido reconoce los movimientos ya confirmados y no vuelve a sumar stock. Otro ID para una orden completada se rechaza. El ingreso manual también usa un ID de borrador; no se presume que un número de documento sea globalmente único entre operaciones manuales nuevas.

## Recepciones parciales anteriores

El código previo no tenía un modelo explícito de pendientes por línea. Sí podía dejar entradas ya registradas si fallaba en una línea posterior. Se conservan esas entradas y se descuentan cantidades vinculadas por orden_id o por la referencia antigua exacta `tipoOperacion=COMPRA`, `documentoTipo=ORDEN DE COMPRA`, `documentoNumero=id de orden`. Se recibe solo lo que falta y se valida que no haya exceso registrado.

Si el historial no permite identificar el producto o asignar una parcial a líneas repetidas con certeza, se bloquea para revisión. No se inventa una asignación ni se borra el historial. Las órdenes antiguas marcadas Ingresado al Kardex se consideran completadas y no se vuelven a recibir automáticamente. Las anomalías anteriores sin movimiento identificable no pueden reconstruirse con certeza.

## Origen de 60 unidades y cero movimientos

El código de inventario contiene PRODUCTOS_BASE: Laptop 15, Monitor 20 y Teclado 25, total 60. `inventarioService.getProductos()` inicializa esos ejemplos si no existe la colección; también tiene una ruta previa de sustitución por ejemplos ante JSON inválido. La inicialización no registra movimientos. `getMovimientos()` devuelve una lista vacía cuando no hay historial. Esos valores explican el escenario descrito, pero no se inspeccionó el localStorage del navegador de las capturas.

En esta fase las pantallas de recepción/movimientos leen directamente los registros, sin ejecutar esa inicialización/normalización. No se borran las 60 unidades, no se crean movimientos iniciales retrospectivos ni ajustes compensatorios. La política de datos iniciales y la conciliación quedan documentadas para fase 6; no se convierte un stock sin historial en cero ni se supone un saldo inicial.

## Verificación y prueba manual

42 pruebas automatizadas aprobadas: 30 anteriores y 12 de fase 3. Incluyen carga sin escritura, proveedor histórico, pendientes, recepción completa, promedio ponderado, historial, IDs comunes, doble confirmación/reintento, orden ya recibida, validación de todas las líneas, fallos de cada escritura y del commit, respaldo/journal fallidos, reversión fallida y recuperación, conflictos que no se sobrescriben, parciales antiguas, ingreso manual, filtro de recepción e inventario sin historial sin conciliación.

Build correcto con advertencia de bundle grande; lint sin errores y con advertencias en código existente. Sin navegador automatizado disponible ni Playwright/Puppeteer instalado: no se probó presentación visual, doble clic físico ni login real en navegador. La autenticación se mantiene activa.

1. Autenticarse, descargar el respaldo comercial desde el panel y anotar stock/costos y movimientos actuales.
2. Crear una orden en Compras. Abrir Ingreso al Kardex, seleccionar Orden de compra pendiente y revisar todas las líneas, proveedor y resumen. Comprobar que elegirla no cambia existencias.
3. Verificar la referencia de orden separada. Intentar confirmar sin número de documento: debe bloquearse. Completar guía/factura/documento real y almacén.
4. Confirmar usando cualquiera de los dos botones e intentar doble clic. Debe generarse una recepción con un movimiento por línea pendiente y actualización única del stock/costo.
5. Comprobar la redirección, filtro de recepción, documento real y movimientos. Quitar filtro para ver el historial completo. Volver a Ingreso: esa orden debe desaparecer solo del selector pendiente.
6. Comprobar un ingreso manual y una orden antigua válida. Para parciales, usar datos de prueba respaldados: solo se reciben cantidades restantes. No forzar fallos en datos reales; las fallas de persistencia se cubren mediante pruebas simuladas.
7. Revisar ausencia de órdenes, acción Crear una compra, modo oscuro y móvil. Mantener las comprobaciones manuales de fases 1 y 2 pendientes.

## Pendientes registrados, sin implementación en esta fase

- Panel: el estilo/texto ALERTA ACTIVA debe depender de alertas reales y no contradecir Inventario en niveles óptimos. Pendiente de corrección del panel/alertas; no se modificó su presentación aquí.
- Fase 5, facturación: revisar “comprobantes contables válidos” y demás etiquetas para describir comprobantes locales sin validación SUNAT.
- Fase 5, estado de cuenta: fechas iniciales fijas, filtros y acción Cobrar con historial de pagos.
- Fase 6, stock: conservar edición descriptiva, impedir cambios directos de existencias, corregir stock inicial duplicado y revisar referencias/conciliación sin inventar saldos.
- Fase 4: identificar APIAMIGO antes de integrar.

No se adelantaron esas fases ni se implementó aislamiento multiempresa; los datos comerciales siguen compartidos por navegador.
