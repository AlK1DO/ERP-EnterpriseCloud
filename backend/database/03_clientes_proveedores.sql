-- ====================================================================
-- 03. TABLAS DE CLIENTES Y PROVEEDORES (INTEGRACIÓN MIGO SUNAT / RENIEC)
-- ERP EnterpriseCloud - PostgreSQL / Supabase
-- ====================================================================

-- 3.1 TABLA: Clientes (Soporta Personas Naturales con DNI y Empresas con RUC)
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_persona VARCHAR(10) NOT NULL CHECK (tipo_persona IN ('NATURAL', 'JURIDICA')),
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'DNI' CHECK (tipo_documento IN ('DNI', 'RUC', 'CE', 'PASAPORTE')),
  documento VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL, -- Nombre completo (RENIEC) o Razón Social (SUNAT)
  nombre_comercial VARCHAR(255),
  
  -- Campos enriquecidos por Migo API (SUNAT)
  estado_sunat VARCHAR(50),      -- 'ACTIVO', 'BAJA', etc.
  condicion_sunat VARCHAR(50),   -- 'HABIDO', 'NO HABIDO'
  ubigeo VARCHAR(20),
  departamento VARCHAR(80),
  provincia VARCHAR(80),
  distrito VARCHAR(80),
  direccion TEXT,
  
  -- Contacto y finanzas
  email VARCHAR(180),
  telefono VARCHAR(50),
  limite_credito NUMERIC(14, 2) DEFAULT 0.00,
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Suspendido')),
  dias_inactivo INT DEFAULT 0,
  
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 TABLA: Historial de Operaciones de Clientes
CREATE TABLE IF NOT EXISTS public.clientes_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  accion VARCHAR(100) NOT NULL,
  detalle TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 TABLA: Proveedores (Soporta Empresas con RUC y Personas con DNI/RUC 10)
CREATE TABLE IF NOT EXISTS public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_persona VARCHAR(10) NOT NULL CHECK (tipo_persona IN ('NATURAL', 'JURIDICA')),
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'RUC' CHECK (tipo_documento IN ('DNI', 'RUC', 'CE')),
  documento VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL, -- Razón Social (SUNAT) o Nombre Completo
  nombre_comercial VARCHAR(255),
  
  -- Campos enriquecidos por Migo API (SUNAT)
  estado_sunat VARCHAR(50),      -- 'ACTIVO', 'BAJA'
  condicion_sunat VARCHAR(50),   -- 'HABIDO', 'NO HABIDO'
  ubigeo VARCHAR(20),
  departamento VARCHAR(80),
  provincia VARCHAR(80),
  distrito VARCHAR(80),
  direccion TEXT,
  
  -- Contacto y condiciones comerciales
  email VARCHAR(180),
  telefono VARCHAR(50),
  condicion_pago INT DEFAULT 30, -- Días de crédito: 0 (Contado), 15, 30, 60, 90 días
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Suspendido')),
  dias_inactivo INT DEFAULT 0,
  
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 TABLA: Historial de Operaciones de Proveedores
CREATE TABLE IF NOT EXISTS public.proveedores_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  accion VARCHAR(100) NOT NULL,
  detalle TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de búsqueda rápida por DNI / RUC y Nombre
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON public.clientes(documento);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_documento ON public.proveedores(documento);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON public.proveedores(nombre);
