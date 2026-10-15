# Integración de autenticación: configuración y verificaciones

Se reutilizaron las pantallas y el contrato de datos del proyecto de referencia, sin modificarlo. No se copiaron secretos, archivos de entorno, node_modules ni dist. No se ejecutaron migraciones, despliegues, asignaciones de administrador ni push.

## Configurar el frontend

Desde `frontend`, copiar `.env.example` a `.env.local` y reemplazar los ejemplos con la URL del proyecto y su clave pública publishable. El cliente utiliza exclusivamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca usar claves secretas, service_role ni credenciales SQL en variables VITE. Reiniciar Vite tras cambiar el entorno.

```powershell
cd C:\Users\Home\ERP-EnterpriseCloud\frontend
Copy-Item .env.example .env.local
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

## Acceso, sesión y datos locales

Sin sesión se redirige a login. Mientras se valida usuario confirmado, perfil, rol y empresa, no se monta el ERP. Los errores bloquean acceso y ofrecen reintento o cierre. Los resultados obsoletos de validaciones se ignoran mediante generaciones. Los eventos del SDK disparan validación fuera de su callback. El SDK restaura y renueva tokens; no se almacenan contraseñas. Un timeout de validación evita mantener indefinidamente la carga en consultas de cuenta.

El selector Cliente/Administrador es visual. El rol real viene de la relación protegida en la base. Clientes sin empresa van a registro-empresa; con empresa entran al ERP. Reportes y mantenimientos, agrupados bajo ADMINISTRACIÓN en el destino, requieren admin tanto por ruta como por menú; siguen siendo módulos en desarrollo. No se añadieron funcionalidades comerciales ni se conectaron módulos que antes no tenían ruta.

El layout y las páginas se desmontan al bloquear la sesión y se montan por identidad, descartando su estado en memoria al cambiar de usuario. No se borran, migran ni atribuyen los datos de localStorage. Las funciones comerciales y sus cálculos permanecen intactos.

IMPORTANTE: los registros comerciales siguen compartidos por navegador, sin aislamiento por usuario o empresa. Otra cuenta que use el mismo navegador puede consultar esos registros después de autenticarse. Esta entrega NO es apta para uso multiempresa. El trabajo posterior requiere un modelo de pertenencia, almacenamiento servidor, políticas RLS y una importación explícita y autorizada de los datos existentes; no se asignan automáticamente a la primera cuenta.

## Verificación

`npm.cmd run test`: pruebas unitarias de la política de acceso para sesiones ausentes, carga, errores, perfil inválido, clientes con/sin empresa, administrador y rechazo de elevación por metadatos. También se prueban mensajes de credenciales incorrectas/correo no confirmado. Son pruebas de lógica, no inicios de sesión reales ni pruebas de navegador.

`npm.cmd run build`: TypeScript y compilación Vite. `npm.cmd run lint`: revisión estática. La compilación no demuestra que los flujos remotos funcionen.

Pendiente de comprobación manual con configuración real: login incorrecto/correcto, correo sin confirmar, registro y reenvío, recepción y callback de confirmación, Google y cancelación, perfil ausente, rol inválido/inactivo, clientes con/sin empresa, administrador, acceso directo a rutas administrativas, recarga, renovación, cierre/Atrás y comportamiento responsive/tema oscuro. No se realizaron pruebas de navegador en esta integración.

Con dos cuentas propias, comprobar que B no puede leer/modificar perfil o empresa de A, que no puede actualizar roles o su rol_id, y que metadatos editables no elevan permisos. Estas pruebas deben usar sesiones ordinarias, nunca una clave privilegiada. Migraciones y pruebas que creen cuentas remotas requieren autorización.
