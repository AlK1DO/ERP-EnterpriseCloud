# Backend y Base de Datos - ERP EnterpriseCloud

API REST desarrollada con Node.js, Express y TypeScript, conectada a Supabase (PostgreSQL). Incluye endpoints de salud, integración con el API de Migo para consulta de RUC y DNI, y los scripts SQL para la creación de tablas, triggers y políticas RLS.

---

## Estructura del Backend

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts                  # Variables de entorno y configuracion general
│   │   ├── supabase.ts             # Cliente y conexion con Supabase
│   │   └── supabaseClient.ts       # Re-export de compatibilidad
│   ├── controllers/
│   │   ├── consultaController.ts   # Consulta de DNI y RUC (Migo API)
│   │   └── healthController.ts     # Health check y estado de conexion
│   ├── middlewares/
│   │   └── errorHandler.ts         # Manejo centralizado de errores
│   ├── routes/
│   │   ├── consultaRoutes.ts       # Rutas /api/consulta-documento
│   │   ├── healthRoutes.ts         # Rutas /api/health
│   │   └── index.ts                # Router principal
│   ├── app.ts                      # Configuracion de Express y middlewares
│   └── index.ts                    # Inicio del servidor
├── database/
│   ├── 00_master_schema.sql        # Script principal con todas las tablas y permisos
│   ├── 01_auth_and_profiles.sql    # Trigger de auth y perfiles
│   ├── 02_catalogs_schema.sql      # Almacenes, categorias, marcas, unidades
│   ├── 03_clientes_proveedores.sql # Clientes y proveedores
│   ├── 04_productos_inventario.sql # Productos y kardex
│   ├── 05_ventas_cotizaciones.sql  # Cotizaciones, ventas y compras
│   ├── 06_rls_security.sql         # Politicas RLS y permisos
│   ├── 07_seed_data.sql            # Datos iniciales basicos
│   ├── 08_tech_products_seed.sql   # Catalogo de productos de prueba
│   └── reset_datos.sql             # Limpiar transacciones para reiniciar pruebas
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Instalacion y ejecucion

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
Crear un archivo `.env` basado en `.env.example`:
```env
PORT=4000
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
MIGO_TOKEN=tu_token_migo
```
El backend también acepta `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y
`VITE_MIGO_TOKEN` si esos son los nombres que ya tienes configurados.

3. Iniciar en desarrollo:
```bash
npm run dev
```

---

## Endpoints de la API

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/api/health` | Estado del servidor y verificacion de conexion con Supabase |
| `GET` | `/api/consulta-documento/dni/:num` | Consulta datos de persona natural en RENIEC |
| `GET` | `/api/consulta-documento/ruc/:num` | Consulta datos de empresa o persona en SUNAT |

---

## Base de Datos (Supabase)

Para desplegar la base de datos en Supabase:
1. Ir al panel de Supabase > **SQL Editor**.
2. Abrir el archivo `database/00_master_schema.sql`.
3. Pegar el contenido y presionar **Run**.
4. Si se requiere limpiar ventas o compras para reiniciar pruebas sin borrar productos ni catalogos, ejecutar `database/reset_datos.sql`.
