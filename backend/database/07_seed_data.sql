-- Almacen central
INSERT INTO public.almacenes (codigo, nombre, direccion, responsable, telefono)
VALUES
  ('ALM-01', 'Almacén Central', 'Sede Principal', 'Administrador', NULL)
ON CONFLICT (codigo) DO NOTHING;

-- Unidades de medida
INSERT INTO public.unidades_medida (codigo, nombre, simbolo)
VALUES
  ('NIU', 'Unidad (Bienes)', 'UND'),
  ('KGM', 'Kilogramo', 'KG'),
  ('MTR', 'Metro Lineal', 'M'),
  ('ROL', 'Rollo', 'ROL'),
  ('BLS', 'Bolsa', 'BLS')
ON CONFLICT (codigo) DO NOTHING;
