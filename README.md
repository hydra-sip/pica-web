# PICA Web 🌐

Plataforma Web Base para el sistema **PICA** (Trabajo Práctico Integrador - SIP / Universidad Nacional de Luján).

[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React Router](https://img.shields.io/badge/React_Router-6.28-CA4245?logo=react-router)](https://reactrouter.com/)
[![MSW](https://img.shields.io/badge/MSW-2.6-FF6A00?logo=mockserviceworker)](https://mswjs.io/)

---

## 🚀 Características y Stack Tecnológico

- **Framework Core**: Vite + React 18 + TypeScript.
- **Enrutamiento**: `react-router-dom` con rutas públicas y privadas.
- **Estructura por Feature**:
  - `src/auth/`: Módulo de Autenticación (Login, Register).
  - `src/admin/`: Módulo Administrativo (Dashboard y métricas).
  - `src/shared/`: Componentes globales, Layouts públicos mobile-first (RF-007) y estilos compartidos.
  - `src/mocks/`: Configuración de Mock Service Worker (MSW) para interceptar peticiones según contrato de API.
- **Calidad de Código**: ESLint v9 (flat config) + Prettier.
- **Variables de Entorno**: `.env` y `.env.example` (`VITE_API_URL`, `VITE_ENABLE_MOCKS`).

---

## 🛠️ Requisitos Previos

- **Node.js**: Versión LTS 18.x o 20.x recomendada.
- **npm** o **pnpm** / **yarn**.

---

## ⚙️ Instalación y Configuración

1. **Clonar el repositorio y situarse en la rama de trabajo:**
   ```bash
   git clone https://github.com/hydra-sip/pica-web.git
   cd pica-web
   git checkout PICA-129-t-106-1-creacion-de-repositorio-pica-web-y-base
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia el archivo de ejemplo para crear tu `.env` local:
   ```bash
   cp .env.example .env
   ```
   Contenido predeterminado:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_ENABLE_MOCKS=true
   ```

---

## 💻 Desarrollo Local

Para iniciar el servidor de desarrollo local con Hot Module Replacement (HMR) y MSW habilitado:

```bash
npm run dev
```

Abre tu navegador en `http://localhost:5173`.

> 💡 **Nota sobre MSW Mocks**:
> En modo desarrollo (`npm run dev`), MSW interceptará automáticamente las llamadas a `${VITE_API_URL}`. Verás el mensaje `[MSW] Mocking enabled.` en la consola del navegador.

### Endpoints Mockeados
- `GET /api/info`: Estado general del contrato.
- `POST /api/auth/login`: Autenticación (`admin@pica.edu.ar` / `admin123`).
- `GET /api/admin/stats`: Métricas del panel administrativo.

---

## 📜 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila TypeScript y genera el bundle optimizado para producción en `dist/`.
- `npm run preview`: Previsualiza localmente la build de producción.
- `npm run lint`: Ejecuta ESLint para analizar errores de sintaxis o tipo.
- `npm run format`: Formatea el código según las reglas de Prettier.

---

## ☁️ Despliegue en Vercel (DoD)

Este proyecto está preparado para desplegarse automáticamente en **Vercel** desde la rama `develop` o `main`:

1. Importar el repositorio `hydra-sip/pica-web` en [Vercel](https://vercel.com/).
2. Framework Preset: **Vite**.
3. Root Directory: `./`.
4. Configurar las variables de entorno en el panel de Vercel (`VITE_API_URL`).
