-- Habilitar RLS en todas las tablas
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

-- Politicas de acceso
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
