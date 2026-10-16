-- ====================================================================
-- ERP ENTERPRISECLOUD - LIMPIEZA DE DATOS TRANSACCIONALES
-- Deja intactos: PRODUCTOS, ALMACENES, CATEGORÍAS Y MARCAS
-- Borra: Ventas, Compras, Cotizaciones, Kardex, Clientes y Proveedores
-- ====================================================================

-- 1. Vaciar Ventas y Facturación
TRUNCATE TABLE public.ventas_items CASCADE;
TRUNCATE TABLE public.ventas CASCADE;

-- 2. Vaciar Cotizaciones
TRUNCATE TABLE public.cotizaciones_items CASCADE;
TRUNCATE TABLE public.cotizaciones CASCADE;

-- 3. Vaciar Órdenes de Compra
TRUNCATE TABLE public.ordenes_compra_items CASCADE;
TRUNCATE TABLE public.ordenes_compra CASCADE;

-- 4. Vaciar Movimientos de Kardex
TRUNCATE TABLE public.kardex_movimientos CASCADE;

-- 5. Vaciar Clientes y Proveedores (para registrarlos desde cero con SUNAT/RENIEC)
TRUNCATE TABLE public.clientes_historial CASCADE;
TRUNCATE TABLE public.clientes CASCADE;
TRUNCATE TABLE public.proveedores_historial CASCADE;
TRUNCATE TABLE public.proveedores CASCADE;

-- NOTA: Las tablas 'productos', 'almacenes', 'lineas_categorias',
-- 'marcas' y 'unidades_medida' NO se tocan y se mantienen 100% intactas.
