-- Base de datos para ERP EnterpriseCloud (PostgreSQL / Supabase)

-- Limpiar tablas si existen
DROP TABLE IF EXISTS public.ventas_items CASCADE;
DROP TABLE IF EXISTS public.ventas CASCADE;
DROP TABLE IF EXISTS public.cotizaciones_items CASCADE;
DROP TABLE IF EXISTS public.cotizaciones CASCADE;
DROP TABLE IF EXISTS public.ordenes_compra_items CASCADE;
DROP TABLE IF EXISTS public.ordenes_compra CASCADE;
DROP TABLE IF EXISTS public.kardex_movimientos CASCADE;
DROP TABLE IF EXISTS public.productos CASCADE;
DROP TABLE IF EXISTS public.clientes_historial CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.proveedores_historial CASCADE;
DROP TABLE IF EXISTS public.proveedores CASCADE;
DROP TABLE IF EXISTS public.unidades_medida CASCADE;
DROP TABLE IF EXISTS public.marcas CASCADE;
DROP TABLE IF EXISTS public.lineas_categorias CASCADE;
DROP TABLE IF EXISTS public.almacenes CASCADE;
DROP TABLE IF EXISTS public.perfiles CASCADE;

-- Confirmar usuarios automaticamente al registrarse
CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_users();

-- Tabla de perfiles
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'ADMIN',
  cargo VARCHAR(100) DEFAULT 'Administrador de Sistema',
  avatar_url TEXT,
  telefono VARCHAR(50),
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo', 'Suspendido')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sincronizar perfiles
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, email, rol, cargo, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'ADMIN',
    'Administrador de Sistema',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    nombre_completo = COALESCE(EXCLUDED.nombre_completo, public.perfiles.nombre_completo);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Almacenes
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

-- Categorias de productos
CREATE TABLE IF NOT EXISTS public.lineas_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marcas
CREATE TABLE IF NOT EXISTS public.marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) UNIQUE NOT NULL,
  pais_origen VARCHAR(80),
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unidades de medida
CREATE TABLE IF NOT EXISTS public.unidades_medida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(10) UNIQUE NOT NULL,
  nombre VARCHAR(60) NOT NULL,
  simbolo VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_persona VARCHAR(10) NOT NULL CHECK (tipo_persona IN ('NATURAL', 'JURIDICA')),
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'DNI' CHECK (tipo_documento IN ('DNI', 'RUC', 'CE', 'PASAPORTE')),
  documento VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  nombre_comercial VARCHAR(255),
  estado_sunat VARCHAR(50),
  condicion_sunat VARCHAR(50),
  ubigeo VARCHAR(20),
  departamento VARCHAR(80),
  provincia VARCHAR(80),
  distrito VARCHAR(80),
  direccion TEXT,
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
  estado_sunat VARCHAR(50),
  condicion_sunat VARCHAR(50),
  ubigeo VARCHAR(20),
  departamento VARCHAR(80),
  provincia VARCHAR(80),
  distrito VARCHAR(80),
  direccion TEXT,
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

-- Indices para clientes y proveedores
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON public.clientes(documento);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON public.clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_proveedores_documento ON public.proveedores(documento);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON public.proveedores(nombre);

-- Productos
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(60) UNIQUE NOT NULL,
  descripcion TEXT NOT NULL,
  linea VARCHAR(120) NOT NULL,
  marca VARCHAR(120) NOT NULL,
  unidad VARCHAR(30) NOT NULL DEFAULT 'UND',
  almacen VARCHAR(120) NOT NULL DEFAULT 'Central',
  precio_compra NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  precio_venta NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  stock INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 10,
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movimientos de kardex
CREATE TABLE IF NOT EXISTS public.kardex_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  producto_codigo VARCHAR(60),
  producto_descripcion TEXT,
  tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA')),
  tipo_operacion VARCHAR(60) NOT NULL CHECK (tipo_operacion IN ('COMPRA', 'VENTA', 'INGRESO_AJUSTE', 'SALIDA_AJUSTE', 'DEVOLUCION', 'TRASLADO')),
  documento_tipo VARCHAR(60),
  documento_numero VARCHAR(60),
  detalle TEXT,
  almacen VARCHAR(120) NOT NULL DEFAULT 'Central',
  cant_entrada INT DEFAULT 0,
  costo_entrada NUMERIC(14, 2) DEFAULT 0.00,
  total_entrada NUMERIC(14, 2) DEFAULT 0.00,
  cant_salida INT DEFAULT 0,
  costo_salida NUMERIC(14, 2) DEFAULT 0.00,
  total_salida NUMERIC(14, 2) DEFAULT 0.00,
  saldo_cantidad INT NOT NULL DEFAULT 0,
  saldo_costo_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  saldo_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actualizar stock desde kardex
CREATE OR REPLACE FUNCTION public.actualizar_stock_producto_kardex()
RETURNS trigger AS $$
BEGIN
  IF NEW.tipo_movimiento = 'ENTRADA' THEN
    UPDATE public.productos
    SET 
      stock = stock + COALESCE(NEW.cant_entrada, 0),
      precio_compra = CASE WHEN COALESCE(NEW.costo_entrada, 0) > 0 THEN NEW.costo_entrada ELSE precio_compra END,
      updated_at = NOW()
    WHERE id = NEW.producto_id;
  ELSIF NEW.tipo_movimiento = 'SALIDA' THEN
    UPDATE public.productos
    SET 
      stock = stock - COALESCE(NEW.cant_salida, 0),
      updated_at = NOW()
    WHERE id = NEW.producto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_kardex_inserted_update_stock ON public.kardex_movimientos;
CREATE TRIGGER on_kardex_inserted_update_stock
  AFTER INSERT ON public.kardex_movimientos
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_stock_producto_kardex();

-- Indices de productos y kardex
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON public.productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_linea ON public.productos(linea);
CREATE INDEX IF NOT EXISTS idx_kardex_producto_id ON public.kardex_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_kardex_fecha ON public.kardex_movimientos(fecha);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(40) UNIQUE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_documento VARCHAR(20),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  validez_dias INT DEFAULT 15,
  moneda VARCHAR(10) DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
  subtotal NUMERIC(14, 2) DEFAULT 0.00,
  igv NUMERIC(14, 2) DEFAULT 0.00,
  total NUMERIC(14, 2) DEFAULT 0.00,
  estado VARCHAR(30) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada', 'Facturada')),
  notas TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detalle de cotizaciones
CREATE TABLE IF NOT EXISTS public.cotizaciones_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ventas
CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(40) UNIQUE NOT NULL,
  tipo_comprobante VARCHAR(30) DEFAULT 'Factura' CHECK (tipo_comprobante IN ('Factura', 'Boleta', 'Nota Venta')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_documento VARCHAR(20),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  metodo_pago VARCHAR(50) DEFAULT 'Efectivo' CHECK (metodo_pago IN ('Efectivo', 'Transferencia', 'Tarjeta', 'Crédito')),
  moneda VARCHAR(10) DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD')),
  subtotal NUMERIC(14, 2) DEFAULT 0.00,
  igv NUMERIC(14, 2) DEFAULT 0.00,
  total NUMERIC(14, 2) DEFAULT 0.00,
  estado VARCHAR(30) DEFAULT 'Completada' CHECK (estado IN ('Pendiente', 'Completada', 'Anulada')),
  notas TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detalle de ventas
CREATE TABLE IF NOT EXISTS public.ventas_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ordenes de compra
CREATE TABLE IF NOT EXISTS public.ordenes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(60) UNIQUE NOT NULL,
  numero VARCHAR(60),
  proveedor_id UUID REFERENCES public.proveedores(id) ON DELETE SET NULL,
  proveedor_nombre VARCHAR(255) NOT NULL,
  proveedor_documento VARCHAR(30),
  proveedor_ruc VARCHAR(30),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  fecha_emision TIMESTAMPTZ DEFAULT NOW(),
  fecha_entrega TIMESTAMPTZ,
  moneda VARCHAR(10) DEFAULT 'PEN',
  subtotal NUMERIC(14, 2) DEFAULT 0.00,
  igv NUMERIC(14, 2) DEFAULT 0.00,
  total NUMERIC(14, 2) DEFAULT 0.00,
  estado VARCHAR(30) DEFAULT 'EMITIDA',
  observaciones TEXT,
  notas TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sincronizar campos de compras
CREATE OR REPLACE FUNCTION public.sync_ordenes_compra_fields()
RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL AND NEW.numero IS NOT NULL THEN
    NEW.codigo := NEW.numero;
  ELSIF NEW.numero IS NULL AND NEW.codigo IS NOT NULL THEN
    NEW.numero := NEW.codigo;
  END IF;

  IF NEW.proveedor_documento IS NULL AND NEW.proveedor_ruc IS NOT NULL THEN
    NEW.proveedor_documento := NEW.proveedor_ruc;
  ELSIF NEW.proveedor_ruc IS NULL AND NEW.proveedor_documento IS NOT NULL THEN
    NEW.proveedor_ruc := NEW.proveedor_documento;
  END IF;

  IF NEW.fecha_emision IS NULL AND NEW.fecha IS NOT NULL THEN
    NEW.fecha_emision := NEW.fecha;
  ELSIF NEW.fecha IS NULL AND NEW.fecha_emision IS NOT NULL THEN
    NEW.fecha := NEW.fecha_emision;
  END IF;

  IF NEW.observaciones IS NULL AND NEW.notas IS NOT NULL THEN
    NEW.observaciones := NEW.notas;
  ELSIF NEW.notas IS NULL AND NEW.observaciones IS NOT NULL THEN
    NEW.notas := NEW.observaciones;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ordenes_compra ON public.ordenes_compra;
CREATE TRIGGER trg_sync_ordenes_compra
  BEFORE INSERT OR UPDATE ON public.ordenes_compra
  FOR EACH ROW EXECUTE FUNCTION public.sync_ordenes_compra_fields();

-- Detalle de ordenes de compra
CREATE TABLE IF NOT EXISTS public.ordenes_compra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id UUID NOT NULL REFERENCES public.ordenes_compra(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
  producto_codigo VARCHAR(60),
  producto_descripcion TEXT,
  descripcion TEXT,
  unidad VARCHAR(30) DEFAULT 'UND',
  cantidad NUMERIC(14, 2) NOT NULL DEFAULT 1,
  costo_unitario NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.sync_ordenes_compra_items_fields()
RETURNS trigger AS $$
BEGIN
  IF NEW.descripcion IS NULL AND NEW.producto_descripcion IS NOT NULL THEN
    NEW.descripcion := NEW.producto_descripcion;
  ELSIF NEW.producto_descripcion IS NULL AND NEW.descripcion IS NOT NULL THEN
    NEW.producto_descripcion := NEW.descripcion;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ordenes_compra_items ON public.ordenes_compra_items;
CREATE TRIGGER trg_sync_ordenes_compra_items
  BEFORE INSERT OR UPDATE ON public.ordenes_compra_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_ordenes_compra_items_fields();

-- Indices de ventas, cotizaciones y compras
CREATE INDEX IF NOT EXISTS idx_ventas_numero ON public.ventas(numero);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON public.ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero ON public.cotizaciones(numero);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_codigo ON public.ordenes_compra(codigo);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_numero ON public.ordenes_compra(numero);
CREATE INDEX IF NOT EXISTS idx_oc_items_orden_id ON public.ordenes_compra_items(orden_id);

-- Seguridad y politicas RLS
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineas_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kardex_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_compra_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'perfiles', 'almacenes', 'lineas_categorias', 'marcas', 'unidades_medida',
    'clientes', 'clientes_historial', 'proveedores', 'proveedores_historial',
    'productos', 'kardex_movimientos', 'cotizaciones', 'cotizaciones_items',
    'ventas', 'ventas_items', 'ordenes_compra', 'ordenes_compra_items'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acceso total para autenticados en %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Lectura publica en %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Permitir select para autenticados en %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Permitir update propio en %I" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Acceso total anon y autenticados en %I" ON public.%I', t, t);

    EXECUTE format('CREATE POLICY "Acceso total anon y autenticados en %I" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Permisos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- Datos iniciales: almacenes y unidades
INSERT INTO public.almacenes (codigo, nombre, direccion, responsable, telefono)
VALUES
  ('ALM-01', 'Almacén Central', 'Sede Principal', 'Administrador', NULL)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.unidades_medida (codigo, nombre, simbolo)
VALUES
  ('NIU', 'Unidad (Bienes)', 'UND'),
  ('KGM', 'Kilogramo', 'KG'),
  ('MTR', 'Metro Lineal', 'M'),
  ('ROL', 'Rollo', 'ROL'),
  ('BLS', 'Bolsa', 'BLS')
ON CONFLICT (codigo) DO NOTHING;

-- Categorias, marcas y productos de prueba
INSERT INTO public.lineas_categorias (codigo, nombre, descripcion)
VALUES
  ('CAT-TEC-01', 'Monitores', 'Pantallas gamer y profesionales'),
  ('CAT-TEC-02', 'Teclados', 'Teclados mecánicos y de oficina'),
  ('CAT-TEC-03', 'Mouses', 'Mouses ópticos e inalámbricos de precisión'),
  ('CAT-TEC-04', 'Laptops', 'Equipos portátiles para oficina y gaming'),
  ('CAT-TEC-05', 'Almacenamiento', 'Discos de estado sólido SSD y NVMe'),
  ('CAT-TEC-06', 'Memorias RAM', 'Módulos de memoria RAM DDR4 y DDR5')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.marcas (nombre, pais_origen)
VALUES
  ('Logitech', 'Suiza'),
  ('Dell', 'Estados Unidos'),
  ('HP', 'Estados Unidos'),
  ('Kingston', 'Estados Unidos'),
  ('Corsair', 'Estados Unidos'),
  ('Asus', 'Taiwán'),
  ('Redragon', 'China')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.productos (
  codigo, descripcion, linea, marca, unidad, almacen,
  precio_compra, precio_venta, stock, stock_minimo, estado
)
VALUES
  ('MON-DELL27', 'Monitor Dell UltraSharp 27" 4K IPS', 'Monitores', 'Dell', 'UND', 'Central', 1350.00, 1850.00, 15, 5, 'Activo'),
  ('MON-ASUS24', 'Monitor Gamer Asus TUF 24" 165Hz FHD', 'Monitores', 'Asus', 'UND', 'Central', 620.00, 850.00, 20, 5, 'Activo'),
  ('TEC-LOGIMX', 'Teclado Mecánico Logitech MX Mechanical Wireless', 'Teclados', 'Logitech', 'UND', 'Central', 380.00, 520.00, 30, 8, 'Activo'),
  ('TEC-REDRAG', 'Teclado Mecánico Redragon Kumara K552 RGB', 'Teclados', 'Redragon', 'UND', 'Central', 110.00, 165.00, 45, 10, 'Activo'),
  ('MOU-G502', 'Mouse Gamer Logitech G502 HERO 25K Sensor', 'Mouses', 'Logitech', 'UND', 'Central', 145.00, 210.00, 35, 10, 'Activo'),
  ('MOU-MXM3S', 'Mouse Inalámbrico Logitech MX Master 3S', 'Mouses', 'Logitech', 'UND', 'Central', 290.00, 399.00, 18, 5, 'Activo'),
  ('LAP-HP450', 'Laptop HP ProBook 450 G9 Core i7 16GB 512GB SSD', 'Laptops', 'HP', 'UND', 'Central', 2950.00, 3750.00, 10, 3, 'Activo'),
  ('LAP-ASUS35', 'Laptop ASUS TUF Gaming F15 Core i7 16GB 512GB SSD RTX', 'Laptops', 'Asus', 'UND', 'Central', 3000.00, 3850.00, 12, 3, 'Activo'),
  ('SSD-KING1TB', 'Disco Sólido Kingston NV2 1TB PCIe 4.0 NVMe M.2', 'Almacenamiento', 'Kingston', 'UND', 'Central', 195.00, 275.00, 50, 15, 'Activo'),
  ('RAM-CORS16', 'Memoria RAM Corsair Vengeance LPX 16GB DDR4 3200MHz', 'Memorias RAM', 'Corsair', 'UND', 'Central', 125.00, 180.00, 40, 12, 'Activo')
ON CONFLICT (codigo) DO UPDATE 
SET 
  precio_compra = EXCLUDED.precio_compra,
  precio_venta = EXCLUDED.precio_venta,
  stock = EXCLUDED.stock;
