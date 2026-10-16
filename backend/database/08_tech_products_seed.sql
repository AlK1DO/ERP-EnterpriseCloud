-- Categorias de tecnologia
INSERT INTO public.lineas_categorias (codigo, nombre, descripcion)
VALUES
  ('CAT-TEC-01', 'Monitores', 'Pantallas gamer y profesionales'),
  ('CAT-TEC-02', 'Teclados', 'Teclados mecánicos y de oficina'),
  ('CAT-TEC-03', 'Mouses', 'Mouses ópticos e inalámbricos de precisión'),
  ('CAT-TEC-04', 'Laptops', 'Equipos portátiles para oficina y gaming'),
  ('CAT-TEC-05', 'Almacenamiento', 'Discos de estado sólido SSD y NVMe'),
  ('CAT-TEC-06', 'Memorias RAM', 'Módulos de memoria RAM DDR4 y DDR5')
ON CONFLICT (codigo) DO NOTHING;

-- Marcas
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

-- Productos de prueba
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
