# Multi-stage Dockerfile para PICA Web (Sistema de Torneos)

# 1. Etapa de Construcción (Build)
FROM node:20-alpine AS build
WORKDIR /app

# Copiar manifiestos de dependencias e instalar
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar bundle estático
COPY . .
# Relativa: en staging la web y la API salen del mismo dominio (Caddy reparte por ruta)
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# 2. Etapa de Producción (Servidor Web Nginx)
FROM nginx:alpine AS production

# Copiar bundle compilado a la ruta servida por Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
