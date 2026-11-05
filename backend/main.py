from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import database

# Importa os módulos separados (SRP)
from routers import auth, documentos, sistema

# 1. Prepara o banco de dados e as pastas
database.iniciar_banco()

# 2. Inicializa o aplicativo principal
app = FastAPI(title="FCJA Docs API")

# 3. Configura CORS para rede local (LAN) e origens autorizadas
# Aceita localhost, 127.0.0.1 e todas as faixas privadas (192.168.x.x, 10.x.x.x, 172.16-31.x.x) em qualquer porta
LAN_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$"

# Permite origens extras definidas via variável de ambiente (separadas por vírgula)
custom_origins = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
allowed_origins = [orig.strip() for orig in custom_origins.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else [],
    allow_origin_regex=LAN_ORIGIN_REGEX if not allowed_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Registra as rotas (SRP)
app.include_router(auth.router)
app.include_router(documentos.router)
app.include_router(sistema.router)
