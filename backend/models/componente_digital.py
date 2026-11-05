from sqlalchemy import Column, Integer, String
from database import Base


class ComponenteDigitalModel(Base):
    """
    Entidade Componente Digital (e-ARQ Brasil v2 - Seção 3 & PREMIS).
    Permite associar 1..N componentes digitais a um Documento Arquivístico,
    registrando formato, fixidade (SHA-256) e localização física.
    """

    __tablename__ = "componentes_digitais"

    id = Column(String(50), primary_key=True, index=True)
    documento_id = Column(String(50), index=True, nullable=False)
    ordem = Column(Integer, default=1)
    nome_arquivo = Column(String(255), nullable=False)
    ext = Column(String(20), default="")
    formato_mime = Column(String(120), default="")
    tamanho_bytes = Column(Integer, default=0)
    hash_sha256 = Column(String(64), index=True, nullable=False)
    algoritmo_hash = Column(String(20), default="SHA-256")
    caminho_relativo = Column(String(500), nullable=False)
    criado_em = Column(String(30), default="")
    ultima_verificacao = Column(String(30), default="")
    status_fixidade = Column(String(30), default="INTEGRO")  # INTEGRO | VIOLADO | ARQUIVO_AUSENTE
