# ========================================
# Dockerfile para Frontend (React + Vite)
# ========================================

# Etapa 1: Construcción
FROM node:20-alpine AS build

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa 2: Servidor de producción
FROM nginx:alpine

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos construidos
COPY --from=build /app/dist /usr/share/nginx/html

# Puerto expuesto
EXPOSE 80

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]