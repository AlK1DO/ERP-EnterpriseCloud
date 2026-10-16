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

-- Actualizar stock segun movimientos del kardex
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

-- Indices
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON public.productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_linea ON public.productos(linea);
CREATE INDEX IF NOT EXISTS idx_kardex_producto_id ON public.kardex_movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_kardex_fecha ON public.kardex_movimientos(fecha);
