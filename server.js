const express = require('express');
const path = require('path');
const db = require('./db/database');

// Sesiones
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;


// Configurar vistas con EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para procesar JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones
app.use(session({
  secret: 'eco_market_secret',
  resave: false,
  saveUninitialized: false
}));

// Middleware para pasar datos de sesión a todas las vistas (usar req.session)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Middleware para verificar si el usuario es PRODUCTOR
function soloProductor(req, res, next) {
  if (req.session.user && req.session.user.rol === 'productor') {
    return next();
  }
  return res.status(403).send('Acceso restringido solo a productores.');
}

// Rutas básicas
app.get('/', (req, res) => {
  res.render('index', { title: 'EcoMarket - Bienvenido' });
});

// Mostrar lista de productos (HTML con EJS)
app.get('/productos', async (req, res) => {
  const categoria = req.query.categoria || '';
  let query = 'SELECT * FROM productos';
  let params = [];

  if (categoria) {
    query += ' WHERE categoria = $1';
    params.push(categoria);
  }

  try {
    const productosResult = await db.query(query, params);
    const productos = productosResult.rows;

    const categoriasResult = await db.query('SELECT DISTINCT categoria FROM productos');
    const categorias = categoriasResult.rows.map(c => c.categoria);

    res.render('productos', {
      title: 'Productos - EcoMarket',
      productos,
      categorias,
      categoriaSeleccionada: categoria
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener productos');
  }
});


// Ver productos del productor
app.get('/productor/productos', soloProductor, async (req, res) => {
  const idProductor = req.session.user.id;
  const query = 'SELECT * FROM productos WHERE id_productor = $1';
  try {
    const result = await db.query(query, [idProductor]);
    res.render('productor_productos', { title: 'Mis Productos', productos: result.rows });
  } catch (err) {
    res.status(500).send('Error al obtener productos.');
  }
});

// Formulario para nuevo producto
app.get('/productor/nuevo', soloProductor, (req, res) => {
  res.render('productor_nuevo', { title: 'Nuevo Producto', error: null });
});

// Crear producto
app.post('/productor/nuevo', soloProductor, async (req, res) => {
  const { nombre, descripcion, precio, stock, imagen_url, categoria } = req.body;
  const query = `
    INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, categoria, id_productor)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  try {
    await db.query(query, [nombre, descripcion, precio, stock, imagen_url, categoria, req.session.user.id]);
    res.redirect('/productor/productos');
  } catch (err) {
    console.error(err);
    res.render('productor_nuevo', { title: 'Nuevo Producto', error: 'Error al guardar el producto.' });
  }
});

// Formulario de edición
app.get('/productor/editar/:id', soloProductor, async (req, res) => {
  const query = 'SELECT * FROM productos WHERE id = $1 AND id_productor = $2';
  try {
    const result = await db.query(query, [req.params.id, req.session.user.id]);
    const producto = result.rows[0];
    if (!producto) return res.status(404).send('Producto no encontrado.');
    res.render('productor_editar', { title: 'Editar Producto', producto, error: null });
  } catch (err) {
    res.status(404).send('Producto no encontrado.');
  }
});

// Guardar edición
app.post('/productor/editar/:id', soloProductor, async (req, res) => {
  const { nombre, descripcion, precio, stock, imagen_url, categoria } = req.body;
  const query = `
    UPDATE productos SET nombre = $1, descripcion = $2, precio = $3, stock = $4, imagen_url = $5, categoria = $6
    WHERE id = $7 AND id_productor = $8
  `;
  try {
    await db.query(query, [nombre, descripcion, precio, stock, imagen_url, categoria, req.params.id, req.session.user.id]);
    res.redirect('/productor/productos');
  } catch (err) {
    res.render('productor_editar', { title: 'Editar Producto', producto: req.body, error: 'Error al actualizar.' });
  }
});

// Eliminar producto
app.post('/productor/eliminar/:id', soloProductor, async (req, res) => {
  try {
    // Elimina los detalles de pedido relacionados con el producto
    await db.query('DELETE FROM detalle_pedido WHERE id_producto = $1', [req.params.id]);
    // Ahora elimina el producto
    await db.query('DELETE FROM productos WHERE id = $1 AND id_productor = $2', [req.params.id, req.session.user.id]);
    res.redirect('/productor/productos');
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).send('Error al eliminar.');
  }
});

// Ver pedidos relacionados con los productos del productor
app.get('/productor/pedidos', soloProductor, async (req, res) => {
  const productorId = req.session.user.id;
  const query = `
    SELECT p.id AS pedido_id, p.fecha, p.estado,
       d.id_producto, d.cantidad, d.estado_envio,
       pr.nombre AS producto_nombre, pr.precio,
       u.nombre AS cliente_nombre
    FROM pedidos p
    JOIN detalle_pedido d ON p.id = d.id_pedido
    JOIN productos pr ON d.id_producto = pr.id
    JOIN usuarios u ON p.id_cliente = u.id
    WHERE pr.id_productor = $1
    ORDER BY p.fecha DESC;
  `;
  try {
    const result = await db.query(query, [productorId]);
    const rows = result.rows;
    const pedidos = {};
    rows.forEach(row => {
      if (!pedidos[row.pedido_id]) {
        pedidos[row.pedido_id] = {
          id: row.pedido_id,
          fecha: row.fecha,
          estado: row.estado,
          cliente: row.cliente_nombre,
          productos: []
        };
      }
      pedidos[row.pedido_id].productos.push({
        id: row.id_producto,
        nombre: row.producto_nombre,
        cantidad: row.cantidad,
        precio: row.precio,
        estado_envio: row.estado_envio
      });
    });
    res.render('productor_pedidos', { title: 'Pedidos Recibidos', pedidos: Object.values(pedidos) });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener pedidos.');
  }
});

// Cambiar estado de un pedido (pendiente -> enviado -> entregado)
app.post('/productor/pedidos/estado-item/:pedidoId/:productoId', soloProductor, async (req, res) => {
  const pedidoId = req.params.pedidoId;
  const productoId = req.params.productoId;
  const nuevoEstado = req.body.estado_envio;

  try {
    // Actualiza el estado del producto en el detalle del pedido
    await db.query(
      'UPDATE detalle_pedido SET estado_envio = $1 WHERE id_pedido = $2 AND id_producto = $3',
      [nuevoEstado, pedidoId, productoId]
    );

    // Obtiene los estados de todos los productos de ese pedido
    const estadosResult = await db.query(
      'SELECT estado_envio FROM detalle_pedido WHERE id_pedido = $1',
      [pedidoId]
    );
    const estadosSolo = estadosResult.rows.map(e => e.estado_envio);

    // Determina el nuevo estado global del pedido
    let nuevoEstadoPedido = 'pendiente';
    if (estadosSolo.every(e => e === 'entregado')) {
      nuevoEstadoPedido = 'entregado';
    } else if (estadosSolo.every(e => e === 'pendiente')) {
      nuevoEstadoPedido = 'pendiente';
    } else {
      // Si hay al menos un producto 'enviado' y ninguno 'pendiente', el pedido está 'enviado'
      // Si hay mezcla de 'pendiente' y 'enviado', el pedido está 'enviado'
      nuevoEstadoPedido = 'enviado';
    }

    // Actualiza el estado global del pedido
    await db.query(
      'UPDATE pedidos SET estado = $1 WHERE id = $2',
      [nuevoEstadoPedido, pedidoId]
    );
    res.redirect('/productor/pedidos');
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    res.status(500).send('Error actualizando estado del producto.');
  }
});

// app.post('/productor/pedidos/estado/:id', soloProductor, (req, res) => {
//   const pedidoId = req.params.id;
//   const estadoActual = req.body.estado;

//   let nuevoEstado = '';
//   if (estadoActual === 'pendiente') nuevoEstado = 'enviado';
//   else if (estadoActual === 'enviado') nuevoEstado = 'entregado';
//   else return res.redirect('/productor/pedidos'); // No hacer nada si ya está entregado

//   const query = `UPDATE pedidos SET estado = ? WHERE id = ?`;
//   db.run(query, [nuevoEstado, pedidoId], err => {
//     if (err) {
//       console.error(err);
//     }
//     res.redirect('/productor/pedidos');
//   });
// });

// Inicializar carrito en la sesión
function initCarrito(req) {
  if (!req.session.carrito) req.session.carrito = [];
}



// Ver carrito
app.get('/carrito', async (req, res) => {
  initCarrito(req);
  const rawCarrito = req.session.carrito;
  const carrito = [];

  for (const item of rawCarrito) {
    try {
      const result = await db.query('SELECT id, nombre, precio, stock FROM productos WHERE id = $1', [item.id]);
      const producto = result.rows[0];
      if (producto) {
        carrito.push({
          id: producto.id,
          nombre: producto.nombre,
          // Convierte precio a número para evitar errores en EJS
          precio: producto.precio !== null ? Number(producto.precio) : null,
          stock: producto.stock,
          cantidad: item.cantidad
        });
      }
    } catch (err) {
      console.error('Error al obtener producto del carrito:', err);
    }
  }
  const mensaje = req.session.mensaje || null;
  delete req.session.mensaje;
  const total = carrito.reduce((acc, item) => acc + (Number(item.precio) || 0) * item.cantidad, 0);
  res.render('carrito', { title: 'Tu Carrito', carrito, total, mensaje });
});


// Agregar producto al carrito
app.post('/carrito/agregar', (req, res) => {
  initCarrito(req);
  const id = parseInt(req.body.id);
  const cantidad = parseInt(req.body.cantidad) || 1;

  if (isNaN(id) || isNaN(cantidad) || cantidad < 1) {
    return res.redirect('/productos');
  }

  const carrito = req.session.carrito;
  const productoExistente = carrito.find(item => item.id === id);

  if (productoExistente) {
    productoExistente.cantidad += cantidad;
  } else {
    carrito.push({ id, cantidad });
  }

  req.session.mensaje = 'Producto agregado al carrito.';
  res.redirect('/carrito');

});

// Vaciar carrito
// app.post('/carrito/vaciar', (req, res) => {
//   if (req.session.carrito) {
//     req.session.carrito = [];
//   }
//   res.redirect('/carrito');
// });


// Eliminar un producto específico del carrito
app.post('/carrito/eliminar', (req, res) => {
  const id = parseInt(req.body.id_producto);
  if (isNaN(id)) {
    return res.redirect('/carrito');
  }

  initCarrito(req);
  req.session.carrito = req.session.carrito.filter(item => item.id !== id);
  req.session.mensaje = 'Producto eliminado del carrito.';
  res.redirect('/carrito');
});



// Confirmar compra
app.post('/carrito/confirmar', async (req, res) => {
  if (!req.session.user || req.session.user.rol !== 'cliente') {
    return res.status(403).send('Debes iniciar sesión como cliente para confirmar una compra.');
  }

  const clienteId = req.session.user.id;
  const carrito = req.session.carrito || [];

  if (carrito.length === 0) {
    return res.redirect('/carrito');
  }

  // Agrupa productos por id y suma cantidades
  const carritoAgrupado = [];
  const mapa = {};
  for (const item of carrito) {
    if (!mapa[item.id]) {
      mapa[item.id] = { ...item };
      carritoAgrupado.push(mapa[item.id]);
    } else {
      mapa[item.id].cantidad += item.cantidad;
    }
  }

  try {
    // Verificar stock
    console.log('carritoAgrupado:', carritoAgrupado);
    for (const item of carritoAgrupado) {
      const result = await db.query('SELECT stock, nombre FROM productos WHERE id = $1', [item.id]);
      const producto = result.rows[0];
      if (!producto || producto.stock < item.cantidad) {
        throw new Error(`El producto "${producto?.nombre || 'desconocido'}" no tiene suficiente stock.`);
      }
    }

    // Insertar pedido y obtener ID
    const pedidoResult = await db.query('INSERT INTO pedidos (id_cliente) VALUES ($1) RETURNING id', [clienteId]);
    const pedidoId = pedidoResult.rows[0].id;
    console.log('Nuevo pedido - Id:', pedidoId);

    // Insertar detalles y actualizar stock SOLO usando carritoAgrupado
    for (const item of carritoAgrupado) {
      await db.query(
        'INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad) VALUES ($1, $2, $3)',
        [pedidoId, item.id, item.cantidad]
      );
      await db.query(
        'UPDATE productos SET stock = stock - $1 WHERE id = $2',
        [item.cantidad, item.id]
      );
    }

    req.session.carrito = [];
    res.render('confirmacion', { title: 'Compra Confirmada', pedidoId });
  } catch (err) {
    console.error('Error en la compra:', err.message);
    const total = carrito.reduce((acc, i) => acc + (Number(i.precio) || 0) * i.cantidad, 0);
    res.render('carrito', {
      title: 'Tu Carrito',
      carrito,
      total,
      mensaje: err.message
    });
  }
});


// Historial de compras
app.get('/historial', async (req, res) => {
  if (!req.session.user || req.session.user.rol !== 'cliente') {
    return res.status(403).send('Debes iniciar sesión como cliente para ver tu historial.');
  }

  const clienteId = req.session.user.id;
  const query = `
    SELECT p.id AS pedido_id, p.fecha, p.estado,
           d.id_producto, d.cantidad,
           pr.nombre AS producto_nombre, pr.precio
    FROM pedidos p
    JOIN detalle_pedido d ON p.id = d.id_pedido
    JOIN productos pr ON d.id_producto = pr.id
    WHERE p.id_cliente = $1
    ORDER BY p.fecha DESC;
  `;

  try {
    const result = await db.query(query, [clienteId]);
    const rows = result.rows;
    const pedidos = {};
    rows.forEach(row => {
      if (!pedidos[row.pedido_id]) {
        pedidos[row.pedido_id] = {
          id: row.pedido_id,
          fecha: row.fecha,
          estado: row.estado,
          productos: []
        };
      }
      pedidos[row.pedido_id].productos.push({
        nombre: row.producto_nombre,
        precio: row.precio,
        cantidad: row.cantidad
      });
    });

    res.render('historial', { title: 'Historial de Compras', pedidos: Object.values(pedidos) });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener el historial de compras.');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Rutas de registro y login
app.get('/registro', (req, res) => {
  res.render('registro', { title: 'Registro - EcoMarket', error: null });
});

app.post('/registro', async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.render('registro', { title: 'Registro - EcoMarket', error: 'Completa todos los campos' });
  }

  try {
    const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.render('registro', { title: 'Registro - EcoMarket', error: 'Este correo ya está registrado' });
    }

    const hashedPass = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4)', [nombre, email, hashedPass, rol]);
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.render('registro', { title: 'Registro - EcoMarket', error: 'Error interno' });
  }
});


app.get('/login', (req, res) => {
  res.render('login', { title: 'Login - EcoMarket', error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { title: 'Login - EcoMarket', error: 'Ingresa email y contraseña' });
  }

  try {
    const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.render('login', { title: 'Login - EcoMarket', error: 'Usuario o contraseña incorrectos' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('login', { title: 'Login - EcoMarket', error: 'Usuario o contraseña incorrectos' });
    }

    req.session.user = { id: user.id, nombre: user.nombre, rol: user.rol };

    if (user.rol === 'cliente') {
      res.redirect('/productos');
    } else if (user.rol === 'productor') {
      res.redirect('/productor/productos');
    } else {
      res.redirect('/');
    }
  } catch (err) {
    res.render('login', { title: 'Login - EcoMarket', error: 'Error interno' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Validación AJAX de email duplicado
app.get('/verificar-email', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.json({ disponible: false });

  try {
    const result = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    res.json({ disponible: result.rows.length === 0 });
  } catch (err) {
    console.error('Error al verificar email:', err);
    res.json({ disponible: false });
  }
});

