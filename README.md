
##  Manual de instalación y despliegue en local – EcoMarket

### **Requisitos previos**

Antes de instalar y ejecutar el proyecto, asegúrate de tener instalado en tu computadora:

* **Node.js** (versión recomendada: 18.x o superior) → [https://nodejs.org](https://nodejs.org)
* **PostgreSQL** (versión recomendada: 15.x) → [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
* **Git** → [https://git-scm.com/downloads](https://git-scm.com/downloads)
* Un editor de código como **Visual Studio Code** (opcional, pero recomendado).

---

###  **Clonar el repositorio**

Abrir una terminal y ejecutar:

```bash
git clone https://github.com/RafaelReds/EcoMarket.git
```

Entrar a la carpeta del proyecto:

```bash
cd EcoMarket
```

---

###  **Configurar las variables de entorno**

Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecomarket
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA
```

⚠️ **Nota**: Cambia `TU_CONTRASEÑA` por la contraseña real de tu usuario de PostgreSQL.
⚠️ Tambien se aplica para el usuario/DB_USER, en este caso, "postgres" 

---

###  **Crear la base de datos**

1. Abrir **psql** o **pgAdmin**.
2. Crear una base de datos llamada `ecomarket`:

```sql
CREATE DATABASE ecomarket;
```

3. Descarga el siguiente script .sql ("repo_ecoMarket.sql) para cargar los datos de las tablas
   (https://drive.google.com/file/d/10LWMaoCE4XdZJiMCvjIrfM1aXawQxiFG/view?usp=sharing)

5. Ejecuta el script .sql descargado:

En **psql**:

```bash
\c ecomarket
\i ruta/al/archivo/repo_ecoMarket.sql
```
Para el comando \i, la ruta puede variar dependiendo de donde hayas guardado el .sql

---

###  **Instalar dependencias**

En la carpeta del proyecto ejecutar:

```bash
npm install
```

Esto instalará todos los paquetes necesarios definidos en `package.json`.

---

###  **Iniciar el servidor**

En la terminal:

```bash
npm start
```

Si todo está correcto, verás:

```
Servidor corriendo en http://localhost:3000
```

---

###  **Acceder a la aplicación**

Abrir un navegador y visitar:

```
http://localhost:3000
```

---

###  **Usuarios de prueba**

El sistema cuenta con usuarios ya registrados para pruebas.


---

* Si deseas cargar más productos, puedes hacerlo desde el panel de productor.
* Si PostgreSQL no inicia, revisa que el servicio esté activo y que las credenciales sean correctas.
* Este manual está diseñado para ejecución en local.

---

