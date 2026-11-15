# ==============================================================================
# DOCKERFILE FRONTEND — SIGAD FCJA (React 19 + TanStack Start + Vite 8)
# ==============================================================================
FROM node:22-alpine

LABEL maintainer="Fundação Casa de José Américo (FCJA)"
LABEL description="Interface Web Arquivística SIGAD FCJA"

ENV NODE_ENV=production \
    TZ=America/Fortaleza \
    BACKEND_INTERNAL_URL=http://backend:8000

WORKDIR /app

# Instala dependências Node com cache de camada otimizado
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copia código-fonte do frontend e gera build de produção
COPY . .
RUN npm run build

EXPOSE 8080

# Serve a aplicação compilada na porta 8080
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8080"]
