# Guía Casio fx-570 — Paso a Paso

App web para saber qué teclas tocar en la Casio fx-570ES PLUS según el ejercicio.

## Cómo deployar en Vercel (gratis, 10 minutos)

### Paso 1 — Subir a GitHub

1. Entrá a [github.com](https://github.com) y creá una cuenta si no tenés
2. Hacé click en **"New repository"**
3. Poné de nombre: `casio570-guia`
4. Dejalo en **Public** y hacé click en **Create repository**
5. Subí todos estos archivos al repo (botón "uploading an existing file")

### Paso 2 — Deployar en Vercel

1. Entrá a [vercel.com](https://vercel.com) y creá una cuenta (podés entrar con GitHub)
2. Click en **"Add New Project"**
3. Importá el repo `casio570-guia` que creaste
4. Vercel lo detecta como Next.js automáticamente — no toques nada
5. **ANTES de hacer deploy**, andá a **"Environment Variables"** y agregá:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** tu API key de Anthropic (la conseguís en console.anthropic.com)
6. Click en **Deploy**

¡Listo! En 1-2 minutos tenés tu URL tipo `casio570-guia.vercel.app`

### Cómo obtener tu API Key de Anthropic

1. Entrá a [console.anthropic.com](https://console.anthropic.com)
2. Registrate (es gratis para empezar)
3. Andá a **API Keys** → **Create Key**
4. Copiá la key y pegala en Vercel como `ANTHROPIC_API_KEY`

> ⚠️ Nunca compartas tu API key ni la subas al código. Vercel la guarda segura como variable de entorno.

### Actualizar la app

Si querés cambiarle algo: modificá el archivo, subí el cambio a GitHub, y Vercel se actualiza solo en segundos.

## Estructura del proyecto

```
casio570/
├── pages/
│   ├── _app.js          # Setup global
│   ├── index.js         # Página principal
│   └── api/
│       └── resolver.js  # Endpoint que llama a la API de Anthropic
├── styles/
│   └── globals.css      # Estilos globales
├── package.json
└── README.md
```
