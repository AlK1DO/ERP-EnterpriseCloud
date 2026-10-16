-- ====================================================================
-- 05. TABLAS DE COTIZACIONES, VENTAS, ÓRDENES DE COMPRA Y DETALLES
-- ERP EnterpriseCloud - PostgreSQL / Supabase
-- ====================================================================

-- 5.1 TABLA: Cotizaciones
CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(40) UNIQUE NOT NULL, -- COT-0001
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

-- 5.2 TABLA: Detalle de Cotizaciones
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

-- 5.3 TABLA: Ventas / Facturación
CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(40) UNIQUE NOT NULL, -- VEN-0001, F001-0001
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

-- 5.4 TABLA: Detalle de Ventas
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

-- 5.5 TABLA: Órdenes de Compra a Proveedores
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

-- 5.6 TABLA: Detalle de Órdenes de Compra
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

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_ventas_numero ON public.ventas(numero);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON public.ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero ON public.cotizaciones(numero);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_codigo ON public.ordenes_compra(codigo);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_numero ON public.ordenes_compra(numero);
CREATE INDEX IF NOT EXISTS idx_oc_items_orden_id ON public.ordenes_compra_items(orden_id);
