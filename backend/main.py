from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import database

# Importação dos nossos módulos separados
from routers import auth, documentos, sistema

# 1. Prepara o banco de dados e as pastas
database.iniciar_banco()

# 2. Inicializa o aplicativo principal
app = FastAPI(title="FCJA Docs API")

# 3. Configuração de Segurança (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Servidor de arquivos estáticos
app.mount("/arquivos", StaticFiles(directory=database.PASTA_ARQUIVOS), name="arquivos")

# 5. Registra as rotas (Os "mini-apps")
app.include_router(auth.router)
app.include_router(documentos.router)
app.include_router(sistema.router)