-- ====================================================================
-- 07. DATOS SEMILLA INICIALES (DEMO REALISTA PARA PERÚ)
-- ERP EnterpriseCloud - PostgreSQL / Supabase
-- ====================================================================

-- 7. CATÁLOGOS BASE BÁSICOS
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

