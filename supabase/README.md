# Supabase Auth para ERP Senatinos

## Inventario revisado

Se revisó el JSON completo proporcionado por el propietario del proyecto. Contiene 17 tablas públicas: `almacenes`, `auditoria`, `categorias`, `clientes`, `compras`, `detalle_compras`, `detalle_ventas`, `documentos`, `inventarios`, `movimientos_inventario`, `pagos`, `permisos`, `productos`, `proveedores`, `roles`, `usuarios` y `ventas`.

Todas tienen RLS habilitado. El inventario no muestra políticas públicas ni triggers de filas sobre `public`/`auth`. Sí contiene la función de event trigger `public.rls_auto_enable`; no se modifica. Habilitar RLS sin políticas no concede acceso a filas desde el navegador, aunque existan grants amplios.

`usuarios.id` y `roles.id` son identidades bigint. `usuarios.rol_id` referencia `roles.id`, y existen otras referencias comerciales a los usuarios. `usuarios.correo` es único, pero no hay relación con `auth.users.id`, que es UUID. No hay una tabla de empresas en el inventario.

Por eso no se reemplaza `usuarios`, no se convierten sus IDs ni se vinculan cuentas automáticamente por correo. Una coincidencia de correo tampoco hereda privilegios históricos. El perfil de Auth reutiliza la tabla `roles`; es un vínculo nuevo para una identidad distinta, no un reemplazo de los usuarios comerciales. Cualquier vinculación futura con usuarios históricos requiere un procedimiento privado explícito y una revisión de sus relaciones.

## Siguiente SQL

Ejecutar **una vez y completo** en SQL Editor, como `postgres`, el archivo:

`supabase/migrations/20261008_auth_companies.sql`

Está **preparado y no ejecutado por el agente**. La transacción:

1. Comprueba que existen las tablas revisadas y que las nuevas tablas no existen. Si el esquema cambió o `roles` ya tiene políticas, aborta para evitar sobrescribirlas.
2. Añade los roles canónicos `client` y `admin` solo si faltan; no renombra roles ni cambia asignaciones existentes. Si uno está inactivo, aborta para que se revise privadamente.
3. Crea `erp_senatinos_profiles`: UUID de Auth, nombre y `rol_id` vinculado a `roles`.
4. Crea `erp_senatinos_companies`: una empresa por UUID autenticado, con los seis campos del formulario. RUC de 11 dígitos es una validación de formato, no de SUNAT.
5. Retira los grants de modificación de `roles` de `anon`, `authenticated` y `PUBLIC`, incluidos grants de columna y de su secuencia. No retira los privilegios de `postgres` ni `service_role`. Permite al usuario autenticado leer solo su rol asignado y activo.
6. Permite leer solo el perfil propio. No concede a los clientes permisos para insertar, editar ni borrar perfiles: no pueden cambiar `rol_id`.
7. Aplica RLS de empresa por `auth.uid()`, grants de columnas que excluyen el propietario y políticas de inserción/edición solo para clientes. Ni un cliente ni un administrador reciben acceso a empresas ajenas con estas políticas.
8. Crea un trigger con `search_path` fijo y ejecución pública revocada. Todo registro público recibe `client`; nunca usa un rol de metadatos editables. Añade perfiles `client` para cuentas Auth ya existentes, sin modificar sus cuentas ni importar empresas.

No elimina ni modifica filas actuales de `usuarios`, clientes comerciales, proveedores, ventas u otras tablas comerciales. No importa datos desde localStorage. Añade filas a `roles` únicamente cuando faltan los dos nombres canónicos y añade las nuevas tablas y perfiles. La referencia `ON DELETE CASCADE` afecta solo al nuevo perfil/empresa si posteriormente se borra deliberadamente su cuenta Auth; cerrar sesión no borra nada.

Después, ejecutar `supabase/verify-auth-security.sql`. Es de solo lectura, devuelve grants/RLS/políticas y los indicadores de permisos deben ser `true`. No sustituye las pruebas de aislamiento con dos cuentas reales.

## Habilitar el registro y los correos

1. En **Authentication > Sign In / Providers**, habilitar el proveedor **Email**, el acceso con correo/contraseña y **Allow new users to sign up**. Mantener desactivados los registros anónimos si no se desean.
2. En la configuración del proveedor Email, mantener **Confirm email** activado. Configurar longitud mínima de contraseña de al menos 8 caracteres; si se exigen reglas adicionales, Supabase también las valida.
3. En **Authentication > URL Configuration**, establecer **Site URL** a `http://localhost:5173` durante el desarrollo.
4. Añadir las redirecciones autorizadas exactas `http://localhost:5173/auth/callback` y, si se usa la dirección alternativa, `http://127.0.0.1:5173/auth/callback`. El origen usado al registrarse determina el callback. No intercambiar localhost/127.0.0.1 en un flujo PKCE, porque el navegador guarda el verificador por origen.
5. Al publicar, establecer Site URL al origen HTTPS real del dominio y añadir `https://TU-DOMINIO/auth/callback`. Sustituir el marcador por el dominio real. Mantener localhost solo si se necesitan pruebas locales; no usar comodines amplios de producción. Configurar el hosting para que las rutas SPA, incluido `/auth/callback`, sirvan `index.html`.
6. En **Authentication > Email Templates > Confirm signup**, usar esta plantilla de enlace para funcionar también cuando la persona abre el correo en otro navegador:

```html
<h2>Activa tu cuenta de ERP Senatinos</h2>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">Activar mi cuenta</a></p>
```

El registro siempre envía `emailRedirectTo` con el callback autorizado. El callback procesa el token mediante `verifyOtp`, elimina los parámetros de la barra del navegador y entra solo después de establecer y validar la sesión. También admite el flujo PKCE estándar con `code` de la plantilla `ConfirmationURL`, que necesita el navegador/origen que inició el registro. No se interpreta un enlace como permiso de administrador.

7. En **Authentication > Email / SMTP Settings** (Custom SMTP), configurar SMTP propio para permitir correos a personas externas. Introducir allí host, puerto, usuario, contraseña SMTP, correo remitente y nombre **ERP Senatinos**, siguiendo los valores del proveedor. Estos secretos no van en `.env.local`, variables `VITE_*` ni el frontend. Verificar dominio remitente y sus registros SPF/DKIM/DMARC, y desactivar seguimiento de enlaces si el proveedor lo reescribe.
8. Revisar **Authentication > Rate Limits** y los límites del proveedor de correo. No desactivar Confirm email para eludir problemas de entrega.

El correo predeterminado de Supabase solo envía a las direcciones de miembros del equipo del proyecto y actualmente limita el envío a 2 correos por hora, sin garantía de entrega. **Para registro público de personas externas se necesita SMTP propio** (o un mecanismo de envío propio configurado en Supabase). Tras configurar SMTP propio también hay límites iniciales que deben revisarse.

Fuentes oficiales consultadas:

- [Configuración general de Auth](https://supabase.com/docs/guides/auth/general-configuration)
- [SMTP y restricciones del servicio predeterminado](https://supabase.com/docs/guides/auth/auth-smtp)
- [Redirecciones autorizadas](https://supabase.com/docs/guides/auth/redirect-urls)
- [Plantillas de correo](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Gestión de perfiles y triggers](https://supabase.com/docs/guides/auth/managing-user-data)
- [RLS y metadatos editables](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Crear después tu cuenta de administrador

1. Aplicar la migración y configurar confirmación/SMTP.
2. Abrir `http://localhost:5173/registro`, registrarte con tu propio nombre, correo y contraseña, y activar la cuenta desde el correo. Inicialmente será `client`, igual que cualquier otra cuenta.
3. En **Authentication > Users**, identificar tu cuenta por su correo verificado y copiar su UUID exacto. Comprobar que pertenece a tu cuenta.
4. Abrir `supabase/assign-admin.sql`, sustituir el UUID de ceros en `target_user_id` y ejecutar el archivo completo **solo desde SQL Editor como operador privado**. El script rechaza el marcador sin reemplazar, exige una cuenta confirmada y un perfil existente, y actualiza exactamente ese perfil al rol `admin` activo.
5. Recargar o cerrar sesión y entrar de nuevo para consultar el rol actualizado. Administrador no necesita registrar empresa. El primer usuario nunca recibe `admin` automáticamente.

No ejecutar este procedimiento desde el navegador ni publicar una función/RPC para elevar roles. No se necesitan claves secretas en el frontend. `assign-admin.sql` también está **preparado, no ejecutado**.

## Límites y comprobaciones

El SDK guarda y renueva tokens de sesión; el código de aplicación no almacena contraseñas. Las claves de sesión/empresa de demostración antiguas quedan ignoradas y sus datos no se borran. El callback y la navegación no confían en el selector ni en `user_metadata.role`: consultan el perfil y el rol protegido. Un perfil ausente, rol desconocido/inactivo o fallo de consulta bloquea el ERP.

Los módulos comerciales conservan su lógica y todavía usan localStorage: sus registros siguen compartidos en el navegador, sin aislamiento por empresa. La autenticación y el RLS de las nuevas empresas **no convierten esa parte en una solución lista para clientes reales**. Su migración requiere otro alcance.

La rama de autenticación documentó previamente pruebas de interfaz con respuestas Auth/REST interceptadas. En esta fusión no se repitieron pruebas en navegador ni se inició sesión contra un proyecto remoto. La verificación automatizada realizada para esta integración fue: `npm.cmd test` (71 pruebas correctas), `npm.cmd run build` (correcto, con advertencia por bundle mayor de 500 kB) y `npm.cmd run lint` (sin errores; advertencias existentes en algunas pantallas).

**No se han ejecutado** migraciones, asignaciones de administrador, creación de cuentas remotas, envío/recepción de confirmación real, ni pruebas de RLS contra dos usuarios reales. La entrega prepara el flujo; esas pruebas requieren aplicar el SQL, SMTP y cuentas propias autorizadas.

No se consultó el proyecto Supabase remoto durante esta fusión. La configuración de SMTP, Site URL, proveedores y redirecciones debe revisarse en el Dashboard del proyecto destino.

### Prueba real pendiente

Con dos cuentas propias A y B, después de configurar Supabase:

- Registrar A y comprobar que antes de activar el correo no accede al dashboard.
- Activar A, entrar con contraseña correcta, registrar empresa, recargar, cerrar sesión y volver a entrar. Probar una contraseña incorrecta y verificar su rechazo.
- Registrar/activar B. Verificar que no ve la empresa de A y que necesita completar la suya.
- Con los tokens de B, comprobar un SELECT/PATCH filtrado por el UUID de A: no debe devolver ni modificar filas. No hacer estas pruebas con una clave privilegiada.
- Intentar desde una sesión client modificar `erp_senatinos_profiles.rol_id` o `roles`: debe rechazarse por falta de permisos. Modificar metadatos editables no debe cambiar el rol consultado desde el servidor.
- Ejecutar la asignación privada de administrador únicamente para tu cuenta elegida y verificar su nuevo flujo.

Si un indicador o prueba falla, detener la prueba y revisar grants/políticas; no ampliarlos para hacerla pasar. No usar ni compartir contraseñas o tokens en archivos de pruebas ni capturas.
## Configuración del frontend integrado

Se reutilizaron las pantallas y el contrato de datos del proyecto de referencia, sin modificarlo. No se copiaron secretos, archivos de entorno, node_modules ni dist. No se ejecutaron migraciones, despliegues, asignaciones de administrador ni push.

## Configurar el frontend

Desde `frontend`, crear o editar `.env.local` (está ignorado por Git) con la URL del proyecto y su clave pública publishable. El cliente utiliza exclusivamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca usar claves secretas, service_role ni credenciales SQL en variables VITE. Reiniciar Vite tras cambiar el entorno.

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<clave-publicable>
```

```powershell
cd C:\Users\Home\ERP-EnterpriseCloud\frontend
if (-not (Test-Path .env.local)) { New-Item -ItemType File .env.local }
npm.cmd install
npm.cmd run dev
```

## Revisar el esquema antes de aplicar SQL

No se conoce el esquema remoto del proyecto destino ni se supone que la migración esté aplicada. `inspect-schema.sql` y `verify-auth-security.sql` son consultas de catálogo de solo lectura; quedan disponibles para una revisión autorizada.

La migración `migrations/20261008_auth_companies.sql` procede de la referencia y está PREPARADA, NO EJECUTADA. Depende de las tablas preexistentes `public.roles` y `public.usuarios`, con los campos y tipos esperados por el SQL. No es una instalación genérica para una base vacía. Aborta si las nuevas tablas ya existen, si roles tiene políticas o si los roles canónicos están inactivos. Si el esquema difiere, se requiere adaptar la migración antes de autorizar su ejecución.

Atención: además de crear perfiles y empresas, revoca permisos API sobre la tabla compartida roles y crea una política para leer solo el rol propio. Revisar su impacto en cualquier otra aplicación que utilice esa tabla; no ejecutar a ciegas. Tampoco se debe crear una política permisiva adicional para solucionar errores de acceso.

El contrato del frontend es:

- `erp_senatinos_profiles`: `user_id` UUID de Auth, `rol_id` y `full_name`.
- Relación `roles!fk_erp_profiles_roles(nombre,activo)`: solo `client` y `admin` activos habilitan acceso.
- `erp_senatinos_companies`: una empresa por `user_id`, con `ruc`, `legal_name`, `fiscal_address`, `trade_name`, `phone` y `email`.

La revisión estática del SQL muestra: perfiles propios de solo lectura para authenticated; sin grants para modificar perfiles o roles; trigger que asigna siempre client e ignora roles de metadatos; empresa con propietario definido por auth.uid(), grants que excluyen user_id y políticas de escritura solo para el cliente propietario. Administradores no reciben acceso a empresas ajenas. Estas observaciones NO verifican las políticas aplicadas en una base real.

No se asignó administrador ni se incluyó un flujo de elevación de privilegios. Un administrador debe estar previamente asignado mediante un procedimiento privado autorizado. Como en la referencia, entra sin registro de empresa. No se implementó administración global ni selección de empresas ajenas.

## Correo, retornos y Google

1. Habilitar Email y registro público en Authentication. Mantener Confirm email habilitado y configurar longitud mínima de contraseña de al menos 8 caracteres.
2. Establecer Site URL a `http://localhost:5173` durante desarrollo. Autorizar `http://localhost:5173/auth/callback`. Si se usa 127.0.0.1, autorizar también su callback exacto y usar ese mismo origen durante todo el flujo PKCE.
3. En producción, usar el origen HTTPS real y autorizar su `/auth/callback` exacto. El hosting debe servir index.html en rutas SPA. No se realizó despliegue.
4. Configurar SMTP dentro de Supabase para entrega de correo; sus credenciales nunca pertenecen al frontend. Comprobar remitente, límites y entrega.
5. El enlace estándar PKCE requiere el navegador que inició el registro. Para permitir confirmar en otro navegador, revisar una plantilla Confirm signup con el enlace `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email`. La página procesa token_hash mediante verifyOtp y deja que el SDK procese códigos PKCE; limpia los parámetros después del retorno.
6. Para Google, habilitar el proveedor en Supabase y configurar su client ID y client secret allí. En Google Cloud registrar como redirect URI el callback de Supabase indicado por el Dashboard, habitualmente `https://TU-PROYECTO.supabase.co/auth/v1/callback`. El retorno de Supabase a la aplicación utiliza `/auth/callback`, autorizado en el paso 2. Los secretos de Google no van en VITE.

Referencias oficiales: [retornos autorizados](https://supabase.com/docs/guides/auth/redirect-urls), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [eventos de sesión](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).

## Acceso, rutas y datos locales

Sin sesión se redirige a login. Mientras se valida usuario confirmado, perfil, rol y empresa, no se monta el ERP. Los errores bloquean acceso y ofrecen reintento o cierre. Los resultados obsoletos de validaciones se ignoran mediante generaciones. Los eventos del SDK disparan validación fuera de su callback. El SDK restaura y renueva tokens; no se almacenan contraseñas. Un timeout de validación evita mantener indefinidamente la carga en consultas de cuenta.

El selector Cliente/Administrador es visual. El rol real viene de la relación protegida en la base. Clientes sin empresa van a registro-empresa; con empresa entran al ERP. Reportes, mantenimientos, usuarios, roles, permisos y auditoría requieren admin tanto por ruta como por menú; siguen siendo módulos en desarrollo. Las rutas comerciales existentes (panel, clientes, proveedores, cotizaciones, ventas, compras, facturación, estado de cuenta e inventario/Kardex) se mantienen dentro de la sesión protegida.

El layout y las páginas se desmontan al bloquear la sesión y se montan por identidad, descartando su estado en memoria al cambiar de usuario. No se borran, migran ni atribuyen los datos de localStorage. Las funciones comerciales y sus cálculos permanecen intactos.

IMPORTANTE: los registros comerciales siguen compartidos por navegador, sin aislamiento por usuario o empresa. Otra cuenta que use el mismo navegador puede consultar esos registros después de autenticarse. Esta entrega NO es apta para uso multiempresa. El trabajo posterior requiere un modelo de pertenencia, almacenamiento servidor, políticas RLS y una importación explícita y autorizada de los datos existentes; no se asignan automáticamente a la primera cuenta.

## Verificación

`npm.cmd test`: pruebas unitarias de la política de acceso para sesiones ausentes, carga, errores, perfil inválido, clientes con/sin empresa, administrador y rechazo de elevación por metadatos. También se prueban mensajes de credenciales incorrectas/correo no confirmado. Son pruebas de lógica, no inicios de sesión reales ni pruebas de navegador.

`npm.cmd run build`: TypeScript y compilación Vite. `npm.cmd run lint`: revisión estática. La compilación no demuestra que los flujos remotos funcionen. Las pruebas manuales de navegador enumeradas arriba requieren una sesión y proyecto Supabase de prueba autorizados.

Pendiente de comprobación manual con configuración real: login incorrecto/correcto, correo sin confirmar, registro y reenvío, recepción y callback de confirmación, Google y cancelación, perfil ausente, rol inválido/inactivo, clientes con/sin empresa, administrador, acceso directo a rutas administrativas, recarga, renovación, cierre/Atrás y comportamiento responsive/tema oscuro. No se realizaron pruebas de navegador en esta integración.

Con dos cuentas propias, comprobar que B no puede leer/modificar perfil o empresa de A, que no puede actualizar roles o su rol_id, y que metadatos editables no elevan permisos. Estas pruebas deben usar sesiones ordinarias, nunca una clave privilegiada. Migraciones y pruebas que creen cuentas remotas requieren autorización.
