from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database

# Importa os nossos módulos separados
from routers import auth, documentos, sistema

# 1. Prepara o banco de dados e as pastas
database.iniciar_banco()

# 2. Inicializa o aplicativo principal
app = FastAPI(title="FCJA Docs API")

# 3. Configura o de Segurança (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Registra as rotas (Os "mini-apps")
app.include_router(auth.router)
app.include_router(documentos.router)
app.include_router(sistema.router)