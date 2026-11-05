import os
import platform
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, String, Integer, BigInteger, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import OperationalError

# Carrega variáveis do arquivo .env localizado na pasta backend/
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

DEFAULT_DATA_DIR = "C:/FCJA_Dados" if platform.system() == "Windows" else "/var/lib/fcja_dados"
PASTA_DADOS = os.getenv("FCJA_PASTA_DADOS", DEFAULT_DATA_DIR)
PASTA_ARQUIVOS = os.path.join(PASTA_DADOS, "arquivos")
DB_FILE = os.path.join(PASTA_DADOS, "fcja_ged.db")

# String de conexão principal (MySQL via PyMySQL por padrão)
DEFAULT_MYSQL_URL = "mysql+pymysql://ged_admin:fcja_ged_2026@localhost:3306/fcja_ged?charset=utf8mb4"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_MYSQL_URL)
ALLOW_SQLITE_FALLBACK = os.getenv("FCJA_ALLOW_SQLITE_FALLBACK", "true").lower() == "true"

Base = declarative_base()


class DocumentoModel(Base):
    __tablename__ = "documentos"

    id = Column(String(64), primary_key=True, index=True)
    tipo_atividade = Column(String(255), default="")
    codigo_classificacao = Column(String(100), default="")
    descricao_codigo = Column(Text, default="")
    nome = Column(String(512), nullable=False)
    ext = Column(String(32), nullable=False)
    categoria = Column(String(255), nullable=False)
    ano = Column(Integer, nullable=False, index=True)
    nucleo = Column(String(255), nullable=False, index=True)
    sigla = Column(String(64), default="")
    upload = Column(String(32), default="")
    hora = Column(String(32), default="")
    url = Column(Text, default="")
    tamanho = Column(BigInteger, default=0)


class UsuarioModel(Base):
    __tablename__ = "usuarios"

    login = Column(String(100), primary_key=True, index=True)
    senha = Column(String(255), nullable=False)
    nome = Column(String(255), nullable=False)
    papel = Column(String(64), nullable=False, default="pesquisador")


def _criar_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_size=10,
        max_overflow=20,
    )


engine = _criar_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency injection de sessão SQLAlchemy para rotas do FastAPI."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def iniciar_banco():
    """
    Inicializa diretórios físicos de armazenamento, cria as tabelas no MySQL
    (com fallback opcional para SQLite em desenvolvimento) e popula usuários iniciais.
    """
    global engine, SessionLocal, DATABASE_URL

    os.makedirs(PASTA_DADOS, exist_ok=True)
    os.makedirs(PASTA_ARQUIVOS, exist_ok=True)

    try:
        Base.metadata.create_all(bind=engine)
    except (OperationalError, Exception) as err:
        if ALLOW_SQLITE_FALLBACK and not DATABASE_URL.startswith("sqlite"):
            sqlite_url = f"sqlite:///{DB_FILE}"
            print(f"[AVISO] MySQL indisponível ({err}). Usando fallback SQLite em: {sqlite_url}")
            DATABASE_URL = sqlite_url
            engine = _criar_engine(DATABASE_URL)
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            Base.metadata.create_all(bind=engine)
        else:
            raise err

    usuarios_equipe = [
        ("barbara", "1980", "Bárbara", "pesquisador"),
        ("andre", "1980", "André", "pesquisador"),
        ("antonio", "1980", "Antonio", "admin"),
        ("pablo", "1980", "Pablo", "pesquisador"),
        ("josilene", "1980", "Josilene", "pesquisador"),
    ]

    with SessionLocal() as db:
        for login, senha, nome, papel in usuarios_equipe:
            existente = db.query(UsuarioModel).filter(UsuarioModel.login == login).first()
            if not existente:
                db.add(UsuarioModel(login=login, senha=senha, nome=nome, papel=papel))
        db.commit()
