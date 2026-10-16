-- ====================================================================
-- 02. TABLAS DE CATÁLOGOS BASE Y MANTENIMIENTOS
-- ERP EnterpriseCloud - PostgreSQL / Supabase
-- ====================================================================

-- 2.1 TABLA: Almacenes
CREATE TABLE IF NOT EXISTS public.almacenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  direccion TEXT,
  responsable VARCHAR(120),
  telefono VARCHAR(50),
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 TABLA: Líneas / Categorías de Productos
CREATE TABLE IF NOT EXISTS public.lineas_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 TABLA: Marcas
CREATE TABLE IF NOT EXISTS public.marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) UNIQUE NOT NULL,
  pais_origen VARCHAR(80),
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 TABLA: Unidades de Medida (Estándar SUNAT: NIU, KGM, MTR, etc.)
CREATE TABLE IF NOT EXISTS public.unidades_medida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(10) UNIQUE NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  simbolo VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
