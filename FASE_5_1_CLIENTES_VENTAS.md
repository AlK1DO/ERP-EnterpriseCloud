# Fase 5.1 - Clientes reales en ventas

## Alcance implementado

- OrdenVentaPage consulta exclusivamente clientesService, la misma fuente de ClientesPage: erp_enterprise_clientes. Se retiro la lista fija del selector de ventas.
- /clientes se encuentra dentro de ProtectedLayout y del menu Ventas. Mantiene las restricciones de sesion, perfil, rol y empresa del ERP; no concede acceso administrativo.
- Se conserva la pantalla existente para crear y editar. Desde el selector se puede abrir en otra pestana y actualizar la lista sin perder la venta en preparacion.
- El servicio antes sembraba automaticamente Acme Corp y Jordan Rojas B cuando faltaba la clave. Ahora devuelve una lista vacia sin escribir. No se eliminaron ni transformaron registros existentes. No se identifican registros por coincidencia de nombre: la interfaz advierte que son datos locales sin verificar y que versiones anteriores pudieron incluir ejemplos.
- Cada nueva orden guarda cliente_id y cliente_datos con nombre, documento, tipo de persona, direccion, correo, telefono y limite de credito. Se comprueba que siga activo y que sus datos no hayan cambiado desde la seleccion antes de guardar. Si cambio, debe seleccionarse nuevamente.
- Nombre y documento validos son obligatorios. Una direccion, correo o telefono ausentes se muestran como no registrados y se guardan como null, sin sustitutos. La validacion de longitud/formato no certifica la identidad ante un proveedor oficial.
- Facturacion ya usa cliente_datos de la orden y crea su propia copia. No consulta el catalogo para completar o reemplazar la identidad. Operaciones antiguas conservan sus propios campos; no se vinculan por nombre. Si carecen de identidad suficiente, la emision se bloquea sin inventarla.

## Persistencia y compatibilidad

- Claves y datos comerciales existentes conservados. No hay migracion ni aislamiento por empresa: los registros siguen siendo locales y compartidos en ese navegador/origen.
- Cada escritura del catalogo prepara erp_respaldo_clientes_<UUID> con el valor original. Un fallo al respaldar impide escribir; un fallo al guardar no se presenta como exito.
- Se incluyeron clientes en commercialSnapshot para los respaldos comerciales existentes.
- La nueva orden conserva los campos anteriores cliente, ruc, items, total y estado, y agrega el snapshot y documento (DNI o RUC). No se actualizan ordenes ni comprobantes antiguos.
- Para proteger el guardado del snapshot junto con la venta, se reutiliza el journal recuperable de inventario, agregando erp_ordenes_venta a sus claves admitidas. Orden, salida y stock se escriben como conjunto recuperable con respaldo previo. La recuperacion existente de Ingreso al Kardex tambien admite este conjunto. Si queda un journal pendiente, se bloquean nuevas escrituras hasta recuperarlo.
- Identificador estable por borrador, firma de solicitud, bloqueo inmediato de ambos botones y bloqueo compartido de inventario/facturacion evitan repetir la misma venta al reintentar. El bloqueo entre pestanas utiliza navigator.locks donde esta disponible; en navegadores sin esa API no se garantiza exclusion entre pestanas concurrentes.
- Se conservan subtotal, IGV del 18%, moneda PEN y descuento de existencias al guardar la orden. Emitir el comprobante no descuenta nuevamente. Se conserva el comportamiento previo de lineas manuales genericas; su revision no pertenece a esta fase.
- Autenticacion, facturacion y cobros anteriores se mantienen. APIAMIGO sigue pendiente del enlace oficial. La consulta OpenRUC actual no se modifico ni se probo contra el proveedor.

## Verificaciones locales

- npm.cmd test: 62 pruebas correctas, 0 fallos (6 nuevas en salesClients.test.mjs).
- Las nuevas pruebas usan almacenamiento en memoria: crear/seleccionar/editar/emitir, snapshots inmutables, identidad incompleta, direccion ausente, catalogo vacio y datos previos, JSON corrupto, compatibilidad antigua, reintentos y rollback de fallo de escritura. No son pruebas de navegador ni consultas reales.
- La suite previa incluye autenticacion, panel, compras, recepcion, facturacion y cobros y continua pasando.
- npm.cmd run build: correcto; Vite advierte del tamano del bundle.
- npm.cmd run lint: sin errores; persisten advertencias en pantallas existentes (variables catch y recomendaciones React).
- No se accedio a credenciales ni se modifico .env.local. No se ejecuto SQL remoto, despliegue, push ni fase 6.

## Pruebas manuales pendientes de navegador

No se dispone de una herramienta de navegador en esta sesion. No se ha comprobado el flujo real con una sesion Supabase, la apariencia ni la impresion fisica. Estos pasos requieren autenticacion funcionando y un emisor configurado con datos propios. Usar un perfil/navegador de prueba o respaldar primero el almacenamiento real; guardar una venta si descuenta stock.

1. Sin sesion, abrir /clientes: debe exigir login. Con una sesion habilitada, entrar por Ventas > Clientes. Verificar que una cuenta comercial no obtiene acceso administrativo.
2. Crear un cliente con nombre, documento valido y direccion propia. En Orden de venta, Buscar cliente debe mostrar ese registro. Si se creo en otra pestana, pulsar Actualizar lista. Revisar nombre, documento, direccion, correo y telefono.
3. Con producto y stock suficientes, guardar una orden. Pulsar ambos botones rapidamente: debe existir una sola orden y una sola salida por linea. Comprobar el stock restante.
4. Editar nombre/documento/direccion del cliente en Clientes. La orden guardada debe conservar los datos anteriores; una nueva seleccion debe mostrar los actuales. Si se edita mientras hay un borrador seleccionado, guardar debe pedir volver a seleccionarlo.
5. Emitir desde Facturacion la orden anterior con emisor propio configurado. Comprobar cliente y direccion historicos, vinculo con orden, importes y comprobante seleccionado al imprimir. Editar nuevamente el cliente y comprobar que el comprobante tampoco cambia. Stock no debe descontarse otra vez.
6. Cliente sin direccion/correo/telefono: mostrar No registrado y conservar ausencias. Nombre/documento invalidos deben impedir guardar sin sustituirlos por ejemplos. Clientes inactivos no se pueden usar en ventas nuevas.
7. Abrir ordenes y comprobantes antiguos: conservar identidad original, sin reasignarlos por nombre. Si falta documento requerido, mostrar bloqueo de emision; no completar desde otro cliente del catalogo.
8. Probar cobro parcial y final de un comprobante; confirmar que no crea otra venta ni cambia stock. Verificar panel y la impresion seleccionada. Repetir las comprobaciones visuales pendientes documentadas en fases anteriores.

Los fallos de escritura y reintentos fueron comprobados en simulacion, sin manipular ni borrar el almacenamiento del usuario.
