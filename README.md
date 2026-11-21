# PICA Web

Módulo Frontend Web para la Plataforma de Gestión de Torneos **PICA** (Trabajo Práctico Integrador - SIP / UNLu).

---

## Arquitectura y Stack Tecnológico

- **Framework Core**: Vite + React 18 + TypeScript.
- **Enrutamiento**: `react-router-dom` con rutas públicas y privadas.
- **Estructura por Feature**:
  - `src/auth/`: Autenticación y control de acceso.
  - `src/admin/`: Panel de control del torneo, métricas y administración.
  - `src/shared/`: Componentes globales, Layouts públicos mobile-first (RF-007) y estilos compartidos.
  - `src/mocks/`: Mock Service Worker (MSW) para simulación del contrato de API durante el desarrollo.
- **Contenerización**: Preparado para entornos microservicios/Docker multicontenedor.

---

## Despliegue con Docker

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

## Desarrollo Local

Para iniciar el servidor de desarrollo local con Hot Module Replacement (HMR) y MSW habilitado:

```bash
npm run dev
```

Abre tu navegador en `http://localhost:5173`.

> **Nota sobre MSW Mocks**:
> En modo desarrollo (`npm run dev`), MSW interceptará las llamadas a la API mockeada.

---

## Testing

Dos niveles en este repo, y la estrategia completa de los tres repos en
[pica-back/docs/testing.md](https://github.com/hydra-sip/pica-back/blob/dev/docs/testing.md):

| Nivel | Herramienta | Qué prueba | Cómo se corre | En el CI |
|---|---|---|---|---|
| Componentes y páginas | Vitest + Testing Library + MSW | cada pantalla con la ruta real y la API de los handlers de MSW (`src/**/*.test.tsx`) | `npm test` | job `verify`, con el lint y el build |
| E2E | Playwright | los flujos críticos con el front compilado contra el back real (`e2e/`) | `npm run e2e:back` y `npm run e2e` | job `e2e`, en paralelo |

Los tests buscan por rol y texto accesible (`getByRole`, `getByLabel`), como lo usa una persona, y comparan con el
valor exacto que se espera: nada de `toBeTruthy()` para un texto o un monto.

## Pruebas de punta a punta (Playwright)

Los E2E de `e2e/` prueban el sistema levantado: el front sin mocks contra el back real. Son pocos y solo de los
flujos críticos; lo demás lo cubren los tests de Vitest (`npm test`), que no los levantan.

```bash
npx playwright install chromium   # una sola vez
npm run e2e:back                  # el back de dev con el seed, en Docker (puerto 8080)
npm run e2e                       # build sin mocks + vite preview en el 4173, y los tests en modo headless
npm run e2e:back:bajar            # al terminar: la base es descartable
```

- `e2e/docker-compose.yml` usa la imagen `ghcr.io/hydra-sip/pica-back:dev` con los perfiles `dev,seed` y los
  plazos de los jobs programados cortos. Los usuarios del seed (`admin`, `dev_organizador`, `dev_arbitro`,
  `dev_jugador1` a `6`) tienen la contraseña `PicaDev2026`.
- `e2e/pages/` tiene un Page Object por pantalla: los localizadores (por rol y texto accesible) en un solo lugar.
- `e2e/support/api.ts` arma los datos de cada test por la API; los clics quedan para lo que se prueba.
- El reporte queda en `playwright-report/` (`npx playwright show-report`) con captura, video y traza de lo que falló.
- En el CI corren en el job `e2e`, en paralelo con lint, tests y build, en cada PR y en cada push a dev y main. Si
  fallan, el reporte, las trazas y el log del back quedan en el artifact `playwright-report`.
- `E2E_BASE_URL` y `E2E_API_URL` apuntan los tests a otro ambiente sin levantar nada.
- Como se prueba contra el back de `dev`, un cambio del front que necesita algo del back todavía sin mergear
  falla hasta que entra el del back.

---

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila TypeScript y genera el bundle de producción en `dist/`.
- `npm run preview`: Previsualiza localmente la build estática.
- `npm run lint`: Ejecuta ESLint.
- `npm run format`: Formatea el código con Prettier.
- `npm run e2e`: Corre los E2E de Playwright (ver arriba).
