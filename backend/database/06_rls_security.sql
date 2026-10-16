-- ====================================================================
-- 06. POLÍTICAS DE SEGURIDAD ROW LEVEL SECURITY (RLS)
-- ERP EnterpriseCloud - PostgreSQL / Supabase
-- ====================================================================

-- 6.1 Habilitar RLS en todas las tablas
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

-- 6.2 Políticas de Acceso: Permitir lectura a usuarios autenticados
CREATE POLICY "Permitir select para autenticados en perfiles" ON public.perfiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir update propio en perfiles" ON public.perfiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Políticas generales para tablas operativas (Lectura y Escritura para usuarios autenticados)
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'almacenes', 'lineas_categorias', 'marcas', 'unidades_medida',
    'clientes', 'clientes_historial', 'proveedores', 'proveedores_historial',
    'productos', 'kardex_movimientos', 'cotizaciones', 'cotizaciones_items',
    'ventas', 'ventas_items', 'ordenes_compra', 'ordenes_compra_items'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acceso total para autenticados en %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Acceso total para autenticados en %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
    -- También permitir lectura con la clave anónima para visualización inicial si es necesario
    EXECUTE format('DROP POLICY IF EXISTS "Lectura publica en %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Lectura publica en %I" ON public.%I FOR SELECT TO anon USING (true)', t, t);
  END LOOP;
END $$;
