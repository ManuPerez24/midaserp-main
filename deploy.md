# Guía de Despliegue de Midas ERP en Vercel

Esta guía detalla los pasos para subir Midas ERP a la nube usando Vercel y GitHub de manera gratuita, para que tu equipo pueda usarlo colaborativamente en internet.

## Paso 1: Preparar servicios en la nube
Tu aplicación necesita servicios externos para la base de datos y envío de correos.

1. **Base de Datos (MongoDB):**
   - Crea una cuenta gratuita en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Crea un nuevo clúster gratuito.
   - En "Database Access", crea un usuario de base de datos con contraseña.
   - En "Network Access", permite el acceso desde cualquier IP (`0.0.0.0/0`) para que Vercel pueda conectarse.
   - Ve a "Databases" -> "Connect" -> "Connect your application" y copia tu cadena de conexión (URI) que empieza con `mongodb+srv://...`. (Reemplaza `<password>` con tu contraseña real).

2. **Correos (Opcional - Resend):**
   - Crea una cuenta en Resend.
   - Ve a "API Keys" y genera una nueva llave. Cópiala (empieza con `re_...`).

## Paso 2: Subir el código a GitHub
Vercel necesita leer tu código desde un repositorio en línea.

1. Crea una cuenta en GitHub si no tienes una.
2. Crea un nuevo repositorio (puede ser Privado para mayor seguridad).
3. Abre la terminal en la carpeta de tu proyecto y ejecuta:
   ```bash
   git init
   git add .
   git commit -m "Primera versión de Midas ERP"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

## Paso 3: Desplegar en Vercel
1. Ve a Vercel y regístrate usando tu cuenta de GitHub.
2. En tu panel principal, haz clic en el botón negro **"Add New..."** y selecciona **"Project"**.
3. En la lista de repositorios de GitHub, busca el que acabas de subir y dale al botón **"Import"**.
4. **¡Paso crucial! Variables de Entorno:**
   Antes de hacer clic en Deploy, abre la sección **"Environment Variables"** y añade las siguientes claves secretas:
   - `MONGODB_URI` : Pega aquí tu cadena de conexión a MongoDB Atlas (o el nombre que use tu archivo de BD).
   - `RESEND_API_KEY` : Pega aquí tu llave de Resend.
5. Haz clic en el botón **"Deploy"**.

Vercel instalará las dependencias y construirá la aplicación (tomará un par de minutos). Al finalizar, te dará un enlace público (ej. `https://midaserp.vercel.app`) que podrás compartir con tu equipo.