from sqlalchemy import Column, String
from database import Base


class UsuarioModel(Base):
    """
    Entidade Usuário / Agente do SIGAD (e-ARQ Brasil v2 - Cap. 7).
    """

    __tablename__ = "usuarios"

    login = Column(String(50), primary_key=True, index=True)
    senha = Column(String(255))
    nome = Column(String(100))
    papel = Column(String(20))  # admin | arquivista | pesquisador
