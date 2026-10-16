-- Limpiar tablas transaccionales para reiniciar pruebas
-- Mantiene intactos: productos, almacenes, categorias y marcas

-- Ventas y facturacion
TRUNCATE TABLE public.ventas_items CASCADE;
TRUNCATE TABLE public.ventas CASCADE;

-- Cotizaciones
TRUNCATE TABLE public.cotizaciones_items CASCADE;
TRUNCATE TABLE public.cotizaciones CASCADE;

-- Compras
TRUNCATE TABLE public.ordenes_compra_items CASCADE;
TRUNCATE TABLE public.ordenes_compra CASCADE;

-- Kardex
TRUNCATE TABLE public.kardex_movimientos CASCADE;

-- Clientes y proveedores
TRUNCATE TABLE public.clientes_historial CASCADE;
TRUNCATE TABLE public.clientes CASCADE;
TRUNCATE TABLE public.proveedores_historial CASCADE;
TRUNCATE TABLE public.proveedores CASCADE;
