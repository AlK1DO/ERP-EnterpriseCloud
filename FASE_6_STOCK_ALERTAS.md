# Fase 6 - Stock de productos y alertas

## Cambios

- Stock y costo promedio son de solo lectura en Stock de productos. El servicio updateProducto rechaza stock, costoUnitario e ID incluso si se envia su valor actual. Se conservan codigo, descripcion, categoria, precio de venta y minimo, asi como los campos descriptivos existentes. Codigo unico (incluidos codigos anteriores), textos obligatorios, precio/minimo numericos finitos y no negativos. Cero es un minimo valido.
- Productos nuevos: stock cero, costo cero y ningun movimiento automatico. El servicio rechaza stockInicial positivo y costo manual. La entrada se registra en Ingreso al Kardex, con un unico incremento. Se elimina el camino anterior que guardaba stock inicial y despues volvia a sumarlo como entrada.
- Costo promedio ponderado actualizado por entradas; salidas conservan el promedio vigente. Valor mostrado = stock actual por costo promedio. Se conserva el saldo/costo previo como punto de partida, porque el historial de apertura es incompleto. No se recalcula retrospectivamente desde Kardex.
- getProductos ya no normaliza ni reescribe al consultar. JSON invalido se bloquea sin reemplazarlo. Se conservan saldos negativos, ceros y valores actuales. Se mantiene la inicializacion preexistente del catalogo base SOLO cuando la clave no existe, ahora con respaldo/journal: 15 laptops, 20 monitores, 25 teclados (60 unidades), sin movimientos de apertura inventados. No se reinicializa una lista vacia ni se generan compensaciones.
- Eliminacion bloqueada si stock es distinto de cero o inconsistente, o si existen referencias en compras, ventas, comprobantes o movimientos. Busqueda por ID/codigo y conservadora por descripcion para comprobantes antiguos. Al renombrar se conservan codigos/descripciones anteriores en el producto para proteger referencias anteriores. Las compras antiguas identificadas solo por codigo pueden recibirse mediante ese alias, sin modificar su snapshot. Una coincidencia conservadora puede impedir eliminar; es preferible revisar el historial antes que perder referencias.
- Se retiran los escritores publicos saveProductos/saveMovimientos que permitian eludir los flujos registrados; no tenian otros consumidores. Crear, editar y eliminar catalogo usan el respaldo y journal recuperable existentes. registrarMovimiento ahora confirma stock, costo y movimiento juntos con el mismo mecanismo. Una escritura fallida restaura el conjunto anterior; un respaldo fallido bloquea la escritura. Recuperacion disponible en Ingreso al Kardex, sin reconstruir inventario.
- Las rutas especializadas de recepcion y ventas siguen confirmando sus saldos directamente mediante el journal; no pasan por updateProducto, de modo que la nueva restriccion no las bloquea. Autenticacion, facturacion y cobros conservados.

## Regla compartida y actualizacion

stockAlerts.ts se utiliza en Stock y en los calculos del panel:

| Estado | Regla |
| --- | --- |
| Sin existencias | Stock = 0 y minimo valido |
| Stock bajo | Stock > 0 y stock <= minimo |
| Normal | Stock > minimo |
| Inconsistente | Stock negativo/no numerico, minimo negativo/no numerico o datos insuficientes |

- El contador critico suma sin existencias y stock bajo. Las inconsistencias se identifican por separado sin modificar saldos. Stock tiene filtro de inconsistencias y aviso con cantidad; el panel muestra los mismos estados y cantidades.
- El panel cambia texto y colores: sin productos criticos ni inconsistencias muestra estado neutral, sin ALERTA ACTIVA; con criticos muestra su cantidad real; con inconsistencias solicita revision. Un error de lectura no se presenta como inventario saludable.
- Resumen PDF/CSV agrega cantidad de inconsistencias y aclara el alcance del contador critico. Estos estados representan inventario actual, independientes del selector de periodo.
- Se elimina Posponer porque no tenia comportamiento. Generar orden de compra se renombra a Ir a crear orden de compra: solo navega al formulario existente, sin crear ni guardar compras.
- Despues del commit/recuperacion se notifica a las vistas montadas mediante erp-inventory-changed. Stock y Panel vuelven a leer datos; tambien escuchan cambios de almacenamiento entre pestanas y el retorno de foco, sin recargar toda la pagina. El journal impide mostrar como confirmado un conjunto pendiente de recuperacion.
- No se implementan exceso de stock, maximos ni productos desbalanceados: falta definicion confirmada. APIAMIGO sigue pendiente; consultas actuales intactas.

## Verificacion local

- npm.cmd test: 71 pruebas correctas, 0 fallos (9 nuevas en tests/stockAlerts.test.mjs).
- Casos nuevos: rechazo de saldo/costo directo, edicion descriptiva/minimo cero, importes invalidos, altas en cero, duplicidad de codigo, fronteras cero/igual/superior, negativos heredados, coherencia con panel, entradas y salidas/promedio, notificacion tras commit, bloqueo de eliminacion por stock/referencias/alias, conservacion de las 60 unidades sin apertura, JSON corrupto, rollback y respaldo fallido, recepcion de compra con codigo antiguo y venta posterior.
- Se mantiene la suite previa de autenticacion, panel, compras, recepciones, clientes, comprobantes y cobros.
- Build correcto. Vite mantiene la advertencia de bundle mayor a 500 kB.
- Lint sin errores; quedan 13 advertencias de variables catch y recomendaciones React en pantallas de ventas, clientes, cotizaciones, proveedores y movimiento de Kardex.
- La lista Stock resalta tambien en rojo el saldo de productos inconsistentes, para no presentarlo como normal.
- Las pruebas utilizan almacenamiento en memoria y eventos simulados. No se inspecciono ni altero el localStorage real del usuario, ni se consulto Supabase. La conservacion de las 60 unidades se comprobo contra el catalogo inicial y mediante lecturas repetidas en las pruebas, no contra una sesion real del navegador.

## Prueba manual pendiente

No se ejecuto una prueba visual en navegador ni se dispuso de una sesion autenticada de prueba. Usar un navegador/perfil de prueba y mantener un respaldo del almacenamiento comercial; las operaciones de entrada/salida si modifican stock.

1. Iniciar sesion sin desactivar la proteccion. En Stock comprobar las existencias previas. Sin hacer operaciones, visitar Kardex y volver: no deben aparecer aperturas nuevas ni cambiar las 60 unidades si ese era el saldo actual.
2. Editar un producto: stock y costo deben ser de solo lectura. Cambiar descripcion, categoria, precio y minimo, incluyendo cero; comprobar que stock/costo no cambian. Intentar minimo negativo o vacio: debe impedir guardar.
3. Crear un producto con codigo nuevo: stock y costo cero, sin movimiento. Ir a Ingreso al Kardex y registrar una entrada de 5 con costo declarado y minimo 5: debe existir un ingreso, stock 5, estado Bajo Stock. Una entrada adicional de 1 cambia el estado a Normal.
4. Desde Movimiento de Kardex registrar salida hasta stock cero: debe quedar Sin existencias. Comprobar Stock y Panel sin recargar la pagina; repetir con ambos abiertos en pestanas distintas. Los contadores y estados deben coincidir.
5. Intentar eliminar un producto con stock: motivo visible. Agotar un producto de prueba con historial e intentar eliminarlo: debe bloquearse por referencias. Un producto nuevo con cero y sin historial si puede eliminarse.
6. Renombrar un producto ya referenciado y comprobar que las ordenes/comprobantes previos mantienen sus datos, que su eliminacion sigue bloqueada y que una compra pendiente antigua puede recibirse.
7. Sin criticos ni inconsistencias, comprobar cabecera neutral Sin alertas de stock. Con cero/bajo, comprobar cantidad real. En un conjunto de prueba heredado con saldo negativo, comprobar Inconsistente sin correccion ni movimientos compensatorios. No introducir negativos en el almacenamiento de produccion para esta prueba.
8. Ir a crear orden de compra solo debe abrir el formulario. Posponer no aparece. Exportar el resumen y verificar cantidades de criticos/inconsistencias actuales, incluso al cambiar semana/mes/anio.
9. Regresion: crear compra no cambia existencias; recibirla cambia una vez stock/promedio; vender descuenta una vez; emitir/cobrar no vuelve a descontar ni duplicar ventas. Confirmar datos y diseno de fases anteriores.

## Limites y pendientes

- La revision visual y las pruebas entre pestanas reales permanecen pendientes. Los bloqueos entre pestanas de escritura requieren navigator.locks, igual que en las fases previas; no se garantiza exclusion entre pestanas en navegadores sin esa API.
- Los codigos anteriores se conservan desde esta fase. No se adivinan asociaciones historicas que ya eran ambiguas ni se reparan referencias antiguas automaticamente.
- No hubo migraciones de registros existentes, reconstruccion desde movimientos, cambios remotos, despliegues ni push. .env.local y credenciales intactos. La tarea se detiene en fase 6.
