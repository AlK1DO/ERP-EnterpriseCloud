# 🏛️ ERP EnterpriseCloud - Backend & Base de Datos (Supabase PostgreSQL)

Este directorio contiene toda la arquitectura de backend, esquemas DDL de PostgreSQL, triggers de automatización, políticas de seguridad (RLS) y catálogos de datos para el sistema **ERP EnterpriseCloud**.

---

## 📁 Estructura del Directorio Backend

```
backend/
├── .env.example                       # Variables de entorno de conexión
├── package.json                       # Configuración y dependencias Node/TypeScript
├── README.md                          # Documentación completa de la BD y arquitectura
├── src/
│   ├── config/
│   │   └── supabaseClient.ts          # Conexión TypeScript a Supabase PostgreSQL
│   └── index.ts                       # Servidor API / microservicio Express
└── database/                          # Scripts SQL modulares y script maestro
    ├── 00_master_schema.sql           # 🔥 SCRIPT COMPLETO UNIFICADO (1 solo clic en Supabase)
    ├── 01_auth_and_profiles.sql       # Trigger auto-confirmación y tabla public.perfiles
    ├── 02_catalogs_schema.sql         # Almacenes, Líneas/Categorías, Marcas, Unidades SUNAT
    ├── 03_clientes_proveedores.sql    # Clientes (DNI/RUC) y Proveedores con campos MIGO (SUNAT/RENIEC)
    ├── 04_productos_inventario.sql    # Productos, Stock y Kardex Valorizado con triggers
    ├── 05_ventas_cotizaciones.sql     # Cotizaciones, Ventas, Facturación y Órdenes de Compra
    ├── 06_rls_security.sql            # Políticas de Seguridad Row Level Security (RLS)
    └── 07_seed_data.sql               # Datos iniciales realistas para empresas de Perú
```

---

## 🚀 Cómo Desplegar la Base de Datos en Supabase (En 1 Minuto)

1. Ingresa a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. En el menú lateral izquierdo, haz clic en **SQL Editor** (icono `>_`).
3. Dale clic al botón verde **`+ New query`**.
4. Abre el archivo **[`database/00_master_schema.sql`](./database/00_master_schema.sql)**, copia todo su contenido y pégalo en el editor de Supabase.
5. Haz clic en el botón verde **`Run`** (o presiona `Ctrl + Enter`).
6. ¡Listo! Todas las tablas, triggers, relaciones e información semilla de Perú quedarán creadas automáticamente.

---

## 🗄️ Esquema de Tablas Implementado

| Tabla | Descripción | Enlaces / Dependencias |
|---|---|---|
| `public.perfiles` | Usuarios del sistema y roles (Admin, Vendedor, Almacenero, Contador) | `auth.users` |
| `public.almacenes` | Locales y almacenes físicos (Central, Lurín, Arequipa) | Catálogo maestro |
| `public.lineas_categorias` | Familias y categorías de productos | Catálogo maestro |
| `public.marcas` | Marcas registradas de insumos y mercadería | Catálogo maestro |
| `public.unidades_medida` | Unidades estándar SUNAT (NIU, KGM, ROL, BLS) | Catálogo maestro |
| `public.clientes` | Clientes (soporta DNI RENIEC y RUC SUNAT con Migo API) | Independiente |
| `public.clientes_historial` | Trazabilidad y auditoría de eventos de clientes | `clientes(id)` |
| `public.proveedores` | Proveedores y socios comerciales con RUC SUNAT | Independiente |
| `public.proveedores_historial` | Trazabilidad y condiciones comerciales con proveedores | `proveedores(id)` |
| `public.productos` | Inventario valorizado, precios de costo y venta, alertas de stock | `almacenes`, `categorias` |
| `public.kardex_movimientos` | Registro de entradas, salidas y saldos con trigger de stock | `productos(id)` |
| `public.cotizaciones` | Cotizaciones comerciales para clientes | `clientes(id)` |
| `public.ventas` | Comprobantes de pago (Factura, Boleta, Nota de Venta) con IGV 18% | `clientes(id)` |
| `public.ordenes_compra` | Adquisiciones y compras formales a proveedores | `proveedores(id)` |

---

## 🛡️ Seguridad y Triggers Automáticos
* **Auto-confirmación (`auto_confirm_new_users`):** Elimina la dependencia de envíos de correos en entornos de desarrollo; valida de inmediato a cualquier usuario registrado.
* **Auto-stock Kardex (`actualizar_stock_producto_kardex`):** Al registrar una entrada o salida en el Kardex, el stock físico del producto se recalcula automáticamente en PostgreSQL.
* **Row Level Security (RLS):** Toda la base de datos está protegida por políticas que permiten operaciones de lectura y escritura controladas por token de autenticación.
