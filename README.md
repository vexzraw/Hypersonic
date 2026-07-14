# HYPERSONIC

Walkie-talkie web PTT con backend, base de datos PostgreSQL, efectos de voz,
salas, amigos, modo en vivo y notificaciones push entre dispositivos.

Diseñado para desplegarse en **Render** (gratis). Funciona entre cualquier
dispositivo: móvil, tablet, PC, en cualquier red del mundo.

## Características

- **Push-to-talk** con botón gigante o barra espaciadora
- **6 efectos de voz**: normal, grave, agudo, distorsión, robot, radio antigua
- **Salas** con límite de miembros y solicitudes de unión
- **Sistema de amigos** con solicitudes entrantes/salientes
- **Modo "en vivo"** que transmite fragmentos cortos en streaming
- **Notificaciones hermosas**: toast con avatar, botones de acción, barra de progreso
- **Sonidos personalizables** por tipo de evento (voz / amigos / salas)
- **Notificaciones nativas** del navegador (con icono HYPERSONIC)
- **Vibración** en móvil
- **3 temas**: Matrix (verde neón), Gris, Blanco glassmorphism
- **PWA instalable** en móvil y escritorio
- **Grabación local** de toda la sesión a `.webm`
- **Descarga de audios** como `.wav`
- **Indicador de conexión** en tiempo real
- **Badge dinámico** en el título de la pestaña con mensajes no leídos

## Arquitectura

- **Frontend**: Next.js 16 + React 19 + Tailwind CSS 4
- **Backend**: API Routes de Next.js (Node runtime)
- **Base de datos**: PostgreSQL con Drizzle ORM
- **Persistencia cliente**: `localStorage` para sesión y preferencias
- **Notificaciones**: Web Notifications API + toasts personalizados
- **PWA**: manifest.json + service worker

## Despliegue en Render (paso a paso)

### Paso 1: Subir el código a GitHub

1. Descomprime `hypersonic.zip` en tu computadora
2. Crea un repo nuevo en GitHub (ej: `hypersonic`)
3. Sube todos los archivos al repo:
   ```bash
   cd hypersonic
   git init
   git add .
   git commit -m "HYPERSONIC v2"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/hypersonic.git
   git push -u origin main
   ```

### Paso 2: Crear la base de datos PostgreSQL en Render

1. Entra en https://dashboard.render.com
2. Clic en **New +** → **PostgreSQL**
3. Nombre: `hypersonic-db` (o el que quieras)
4. Región: la más cercana a ti
5. Plan: **Free** (suficiente para empezar)
6. Clic en **Create database**
7. Espera a que esté lista (1-2 minutos)
8. **Copia la "Internal Database URL"** — la vas a necesitar

> La Internal URL solo funciona desde dentro de Render. La External URL
> funciona desde cualquier lado. Usa Internal para el web service.

### Paso 3: Crear el Web Service en Render

1. En Render dashboard: **New +** → **Web Service**
2. Conecta tu cuenta de GitHub y selecciona el repo `hypersonic`
3. Configura:
   - **Name**: `hypersonic` (o el que quieras)
   - **Runtime**: Node (automático)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free
4. Clic en **Advanced** → **Add Environment Variable**:
   - **Key**: `DATABASE_URL`
   - **Value**: Pega la Internal Database URL del Paso 2
5. Clic en **Create Web Service**

### Paso 4: Esperar el primer deploy

Render va a:
1. Instalar dependencias (`npm install`)
2. Compilar (`npm run build`)
3. Arrancar (`npm run start`)

Esto tarda 3-5 minutos. Cuando termine, verás una URL como:
`https://hypersonic-xxxx.onrender.com`

### Paso 5: Inicializar la base de datos

**Opcional pero recomendado**: visita esta URL en el navegador:
```
https://TU-APP.onrender.com/api/seed
```
Debe responder:
```json
{"ok":true,"message":"Base de datos lista. Tablas creadas y salas por defecto insertadas."}
```

Si todo está bien, abre la URL raíz y ¡listo! HYPERSONIC está funcionando.

> Nota: las tablas se crean automáticamente en el primer request, así que
> este paso es solo para verificar que todo está conectado.

### Paso 6: Verificar salud

Visita:
```
https://TU-APP.onrender.com/api/health
```
Debe responder:
```json
{"ok":true,"name":"HYPERSONIC","version":"2.0.0","time":"..."}
```

## Cómo usar HYPERSONIC

1. **Crea tu perfil**: nombre + foto opcional
2. **Permite las notificaciones** cuando el navegador te lo pida
3. **Entra a una sala** (las hay por defecto: "Sala General", "Música", "Gaming", "Charla libre")
4. **Comparte la URL** con otras personas para que creen su perfil
5. **Agrega amigos**: ve a la pestaña "Amigos" y manda solicitudes
6. **Mantén presionado el botón** (o la barra espaciadora) para hablar
7. **Cambia a "En vivo"** para transmitir fragmentos cortos continuos
8. **Cambia el efecto de voz** en el selector (grave, agudo, robot, etc.)
9. **Personaliza los sonidos** en Configuración (icono engranaje)

## Sincronización entre dispositivos

HYPERSONIC usa **PostgreSQL** como fuente de verdad compartida. Cualquier
dispositivo que acceda a la URL verá los mismos usuarios, salas, mensajes y
solicitudes. La app hace polling cada 1.5 segundos para detectar novedades.

Cuando alguien te envía un mensaje de voz o una solicitud:
- 📱 Si la app está abierta: ves un **toast hermoso** + **sonido** + **vibración**
- 🔔 Si la app está en background: ves una **notificación nativa** del sistema
- 🔢 El **título de la pestaña** muestra el contador de no leídos

## Notas sobre el plan free de Render

- El web service se duerme tras 15 min de inactividad. La primera request
  después tarda ~30s en despertarlo. Es normal.
- La base de datos PostgreSQL free expira a los **90 días**. Tendrás que
  migrar a un plan de pago ($7/mes) o crear una nueva y mover los datos.
- Alternativa gratuita para siempre: **Neon Postgres** (https://neon.tech).
  El proceso es idéntico: te da un `DATABASE_URL` que pegas en Render.

## Desarrollo local

```bash
# 1. Instala dependencias
npm install

# 2. Necesitas una base de datos Postgres local o en Neon
#    Crea un archivo .env.local con:
#    DATABASE_URL=postgres://usuario:password@localhost:5432/hypersonic

# 3. Modo desarrollo
npm run dev

# 4. Abre http://localhost:3000
```

## Estructura del proyecto

```
hypersonic/
├── render.yaml                 # Blueprint de Render (opcional)
├── .env.example                # Variables de entorno
├── README.md                   # Este archivo
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── drizzle.config.ts           # Config de Drizzle ORM
├── public/
│   ├── icon.svg                # Icono HYPERSONIC
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker
└── src/
    ├── app/
    │   ├── globals.css         # Estilos + temas
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── api/
    │       ├── health/route.ts # Health check
    │       ├── seed/route.ts   # Inicializar BD
    │       ├── users/route.ts
    │       ├── rooms/route.ts
    │       ├── messages/route.ts
    │       └── friends/route.ts
    ├── components/
    │   ├── WalkieTalkie.tsx    # UI principal
    │   ├── NotifyToaster.tsx   # Sistema de notificaciones
    │   └── icons.tsx
    ├── lib/
    │   ├── audio.ts            # Captura, efectos, reproducción
    │   └── notify.ts           # Notificaciones + sonidos
    └── db/
        ├── index.ts            # Pool de conexión
        ├── schema.ts           # Esquema Drizzle
        └── migrate.ts          # Auto-migración al arrancar
```

## Navegadores compatibles

- Chrome / Edge / Brave (recomendado)
- Firefox
- Safari 14+ (algunos efectos de voz pueden variar)
- Chrome Android (funciona muy bien como PWA instalable)

Requiere `MediaRecorder`, `AudioContext`, `Notification` y `localStorage`.

## Solución de problemas

### "Error de red" al registrarme
- Verifica que la base de datos esté activa en Render
- Visita `/api/health` — si responde `ok: false`, hay problema con `DATABASE_URL`
- Reinicia el web service en Render

### No me llegan notificaciones
- En el navegador: verifica que las notificaciones estén permitidas
- En móvil iOS: las notificaciones web solo funcionan en Safari 16.4+ añadida a inicio
- En Chrome Android: añade la app a inicio como PWA

### El audio no se reproduce
- Necesitas interactuar con la página primero (clic en cualquier botón)
- Chrome bloquea el audio hasta que hay interacción del usuario

### La app se duerme en Render
- Es normal en el plan free. Considera pagar $7/mes o usar otra plataforma

## Licencia

MIT - haz con esto lo que quieras.
