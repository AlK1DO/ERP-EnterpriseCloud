-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_persona VARCHAR(10) NOT NULL CHECK (tipo_persona IN ('NATURAL', 'JURIDICA')),
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'DNI' CHECK (tipo_documento IN ('DNI', 'RUC', 'CE', 'PASAPORTE')),
  documento VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  nombre_comercial VARCHAR(255),
  
  -- Datos SUNAT / RENIEC
  estado_sunat VARCHAR(50),
  condicion_sunat VARCHAR(50),
  ubigeo VARCHAR(20),
  departamento VARCHAR(80),
  provincia VARCHAR(80),
  distrito VARCHAR(80),
  direccion TEXT,
  
  -- Contacto
  email VARCHAR(180),
  telefono VARCHAR(50),
  limite_credito NUMERIC(14, 2) DEFAULT 0.00,
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Suspendido')),
  dias_inactivo INT DEFAULT 0,
  
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de clientes
CREATE TABLE IF NOT EXISTS public.clientes_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  accion VARCHAR(100) NOT NULL,
  detalle TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_persona VARCHAR(10) NOT NULL CHECK (tipo_persona IN ('NATURAL', 'JURIDICA')),
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'RUC' CHECK (tipo_documento IN ('DNI', 'RUC', 'CE')),
  documento VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  nombre_comercial VARCHAR(255),
  
  -- Datos SUNAT
  estado_sunat VARCHAR(50),
  condicion_sunat VARCHAR(50),
  ubigeo VARCHAR(20),
  departamento VARCHAR(80),
  provincia VARCHAR(80),
  distrito VARCHAR(80),
  direccion TEXT,
  
  -- Contacto
  email VARCHAR(180),
  telefono VARCHAR(50),
  condicion_pago INT DEFAULT 30,
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Suspendido')),
  dias_inactivo INT DEFAULT 0,
  
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de proveedores
CREATE TABLE IF NOT EXISTS public.proveedores_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  accion VARCHAR(100) NOT NULL,
  detalle TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON public.clientes(documento);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_documento ON public.proveedores(documento);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON public.proveedores(nombre);
