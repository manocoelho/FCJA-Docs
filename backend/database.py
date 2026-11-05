import os
import platform
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. DEFINIÇÃO DINÂMICA DA PASTA DE DADOS
DEFAULT_DATA_DIR = "C:/FCJA_Dados" if platform.system() == "Windows" else "/var/lib/fcja_dados"
PASTA_DADOS = os.getenv("FCJA_PASTA_DADOS", DEFAULT_DATA_DIR)
PASTA_ARQUIVOS = os.path.join(PASTA_DADOS, "arquivos")
os.makedirs(PASTA_ARQUIVOS, exist_ok=True)

# 2. CONFIGURAÇÃO DA CONEXÃO COM O BANCO DE DADOS (MySQL com fallback para SQLite)
DB_USER = os.getenv("FCJA_DB_USER", "fcja_user")
DB_PASS = os.getenv("FCJA_DB_PASS", "fcja_senha_segura_2026")
DB_HOST = os.getenv("FCJA_DB_HOST", "localhost")
DB_PORT = os.getenv("FCJA_DB_PORT", "3306")
DB_NAME = os.getenv("FCJA_DB_NAME", "fcja_ged")

DEFAULT_MYSQL_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
DATABASE_URL = os.getenv("FCJA_DATABASE_URL", DEFAULT_MYSQL_URL)

try:
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        with engine.connect() as _:
            pass
except Exception as erro_mysql:
    print(f"[AVISO] MySQL indisponível ({erro_mysql}). Usando fallback SQLite local.")
    CAMINHO_BANCO_SQLITE = os.path.join(PASTA_DADOS, "fcja_acervo.db")
    engine = create_engine(
        f"sqlite:///{CAMINHO_BANCO_SQLITE}",
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Re-exporta os modelos isolados (models/) mantendo compatibilidade total
from models.documento import DocumentoModel  # noqa: E402
from models.componente_digital import ComponenteDigitalModel  # noqa: E402
from models.evento import EventoArquivisticoModel  # noqa: E402
from models.termo_eliminacao import TermoEliminacaoModel  # noqa: E402
from models.pcd_ttd import ClassePcdModel  # noqa: E402
from models.dossie import UnidadeArquivamentoModel  # noqa: E402
from models.usuario import UsuarioModel  # noqa: E402


def iniciar_banco():
    from core.security import gerar_hash_senha
    from services.migracao_service import (
        migrar_esquema_banco,
        migrar_senhas_e_papeis_usuarios,
        sincronizar_legado_earq,
    )
    from services.temporalidade_service import popular_classes_pcd_iniciais
    from services.dossie_service import popular_dossies_iniciais

    Base.metadata.create_all(bind=engine)
    migrar_esquema_banco(engine)

    with SessionLocal() as db:
        if db.query(UsuarioModel).count() == 0:
            senha_hash = gerar_hash_senha("1980")
            usuarios_padrao = [
                UsuarioModel(login="pesquisador", senha=senha_hash, nome="Pesquisador FCJA", papel="pesquisador"),
                UsuarioModel(login="arquivista", senha=senha_hash, nome="Arquivista SIGAD FCJA", papel="arquivista"),
                UsuarioModel(login="admin", senha=senha_hash, nome="Administrador Geral", papel="admin"),
            ]
            db.add_all(usuarios_padrao)
            db.commit()
        else:
            migrar_senhas_e_papeis_usuarios(db)

        popular_classes_pcd_iniciais(db)
        sincronizar_legado_earq(db, PASTA_ARQUIVOS)
        popular_dossies_iniciais(db)
