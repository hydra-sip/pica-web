# PICA Web 🌐

Módulo Frontend Web para la Plataforma de Gestión de Torneos **PICA** (Trabajo Práctico Integrador - SIP / UNLu).

---

## 🚀 Arquitectura y Stack Tecnológico

- **Framework Core**: Vite + React 18 + TypeScript.
- **Enrutamiento**: `react-router-dom` con rutas públicas y privadas.
- **Estructura por Feature**:
  - `src/auth/`: Autenticación y control de acceso.
  - `src/admin/`: Panel de control del torneo, métricas y administración.
  - `src/shared/`: Componentes globales, Layouts públicos mobile-first (RF-007) y estilos compartidos.
  - `src/mocks/`: Mock Service Worker (MSW) para simulación del contrato de API durante el desarrollo.
- **Contenerización**: Preparado para entornos microservicios/Docker multicontenedor.

---

## 🐳 Despliegue con Docker

El proyecto cuenta con un `Dockerfile`

### Construir la imagen Docker:
```bash
docker build -t pica-web .
```

### Ejecutar el contenedor:
```bash
docker run -d -p 8080:80 --name pica-web-app pica-web
```

Acceder a `http://localhost:8080`.

### Integración en `docker-compose` (Frontend + Backend):
```yaml
version: '3.8'

services:
  pica-web:
    build: .
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://pica-backend:3000/api
    depends_on:
      - pica-backend

  pica-backend:
    image: pica-backend:latest
    ports:
      - "3000:3000"
```

---

## 💻 Desarrollo Local

Para iniciar el servidor de desarrollo local con Hot Module Replacement (HMR) y MSW habilitado:

```bash
npm run dev
```

Abre tu navegador en `http://localhost:5173`.

> 💡 **Nota sobre MSW Mocks**:
> En modo desarrollo (`npm run dev`), MSW interceptará las llamadas a la API mockeada.

---

## 📜 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila TypeScript y genera el bundle de producción en `dist/`.
- `npm run preview`: Previsualiza localmente la build estática.
- `npm run lint`: Ejecuta ESLint.
- `npm run format`: Formatea el código con Prettier.
