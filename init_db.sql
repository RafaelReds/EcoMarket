
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    rol TEXT CHECK(rol IN ('cliente', 'productor')) NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    imagen_url TEXT,
    categoria TEXT,
    id_productor INTEGER NOT NULL,
    FOREIGN KEY (id_productor) REFERENCES usuarios(id)
);


CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado TEXT CHECK(estado IN ('pendiente', 'enviado', 'entregado')) DEFAULT 'pendiente',
    FOREIGN KEY (id_cliente) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pedido INTEGER NOT NULL,
    id_producto INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id),
    FOREIGN KEY (id_producto) REFERENCES productos(id)
);


INSERT INTO usuarios (nombre, email, password, rol) VALUES
('Juan Pérez', 'cliente@eco.com', '1234', 'cliente'),
('Ana Torres', 'productor@eco.com', '1234', 'productor');


INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, categoria, id_productor) VALUES
('Miel Orgánica', 'Miel natural de abeja 100% orgánica', 120.50, 20, 'img/miel.jpg', 'alimentos', 2),
('Pan Artesanal', 'Pan de masa madre hecho a mano', 50.00, 15, 'img/pan.jpg', 'alimentos', 2),
('Queso Fresco', 'Queso artesanal fresco', 80.00, 10, 'img/queso.jpg', 'alimentos', 2),
('Café Orgánico', 'Café molido orgánico', 90.00, 25, 'img/cafe.jpg', 'bebidas', 2),
('Jabón Natural', 'Jabón artesanal con aceites esenciales', 40.00, 30, 'img/jabon.jpg', 'higiene', 2),
('Velas Aromáticas', 'Velas con esencias naturales', 70.00, 12, 'img/vela.jpg', 'decoración', 2),
('Salsa Picante', 'Salsa artesanal con chile habanero', 45.00, 18, 'img/salsa.jpg', 'alimentos', 2),
('Chocolate Amargo', 'Chocolate 70% cacao artesanal', 65.00, 14, 'img/chocolate.jpg', 'alimentos', 2),
('Aceite de Coco', 'Aceite de coco orgánico prensado en frío', 110.00, 8, 'img/aceite.jpg', 'salud', 2),
('Té de Hierbas', 'Infusión de hierbas orgánicas', 55.00, 20, 'img/te.jpg', 'bebidas', 2);
