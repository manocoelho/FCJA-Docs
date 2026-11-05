from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database
from routers import auth, documentos, sistema, auditoria, pcd_ttd, dossies

# 1. INICIALIZAÇÃO DO BANCO DE DADOS E MIGRAÇÃO AUTOMÁTICA e-ARQ v2
database.iniciar_banco()

# 2. CONFIGURAÇÃO DO SERVIDOR WEB (SIGAD FCJA)
app = FastAPI(
    title="SIGAD FCJA — API Arquivística (e-ARQ Brasil v2)",
    version="3.0.0",
)

# 3. LIBERAÇÃO DO CORS (Restrito à Rede Local da FCJA e Localhost)
ORIGENS_PERMITIDAS = [
    "http://localhost",
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENS_PERMITIDAS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.1\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 4. REGISTRO DAS ROTAS (MODULARIZAÇÃO SRP)
app.include_router(auth.router)
app.include_router(documentos.router)
app.include_router(pcd_ttd.router)
app.include_router(dossies.router)
app.include_router(auditoria.router)
app.include_router(sistema.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
