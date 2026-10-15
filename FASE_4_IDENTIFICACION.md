# Fase 4: revisión inicial; integración pendiente de documentación oficial

Se revisaron código, rutas y documentación del repositorio. Solo existen menciones de APIAMIGO como tarea pendiente en FASE_1_PANEL.md y FASE_3_KARDEX.md; no se encontró un enlace oficial, contrato de API, endpoints ni configuración del proveedor. No se inspeccionaron archivos de entorno ni se mostraron secretos.

| Área | Consulta actual | Accesibilidad |
|---|---|---|
| ClientesPage / clientesService | consultarRUC usa OpenRUC directamente desde navegador; intenta completar nombre desde razon_social y dirección desde direccion | El componente existe, pero no tiene ruta en App.tsx ni enlace en la navegación actual. |
| ProveedoresPage / proveedoresService | Mismo proveedor y campos de respuesta; no consulta DNI | El componente de mantenimiento no tiene ruta. Compras y recepción sí usan proveedoresService para leer proveedores locales, pero no llaman a consultarRUC. |
| CompanyRegistrationPage | Registro manual de RUC, razón social, dirección fiscal y datos opcionales; validación local de formato, sin consulta de identificación | /registro-empresa es accesible para clientes autenticados sin empresa. Clientes con empresa y administradores se redirigen al ERP. |

Los manejadores actuales de clientes/proveedores comprueban longitud de RUC, pero no exclusivamente dígitos. Conservan datos ante fallo de consulta; sin embargo, no comprueban que el documento y el formulario sigan siendo los mismos antes de aplicar una respuesta asíncrona. Se debe proteger ese caso al integrar el proveedor confirmado, incluyendo cierre/cambio de formulario y ediciones manuales posteriores.

## Bloqueo y siguiente paso

Se necesita el enlace oficial de APIAMIGO antes de implementar su conexión. No se confirmó si admite RUC, DNI o ambos, qué devuelve, cómo autentica ni sus límites. No se sustituyó OpenRUC, no se inventaron endpoints y no se añadieron variables de credenciales.

Con esa documentación se definirá un mapeo únicamente de campos respaldados por la respuesta: los candidatos de los formularios son nombre/razón social y dirección; los demás dependerán del contrato real. Ninguna consulta modificará automáticamente snapshots de órdenes o comprobantes.

Si requiere una clave privada, la llamada deberá pasar por un componente de servidor autenticado, con el secreto en su entorno y límites de consultas. No irá en VITE_* ni en el navegador. Su implementación y variables exactas dependen de la autenticación documentada y del entorno servidor disponible; no se asume un backend existente.

También deberá decidirse si conectar los mantenimientos de clientes y proveedores a rutas accesibles forma parte de esta fase: actualmente no lo están. No se ampliaron las rutas ni permisos durante esta revisión.

No se realizaron consultas a OpenRUC o APIAMIGO, pruebas simuladas del proveedor, despliegues ni cambios remotos. No se modificaron autenticación, módulos comerciales, cálculos, persistencia ni históricos. No se ejecutaron build/lint porque esta entrega solo añade este documento de revisión.
