from sqlalchemy import Column, Integer, String, Text
from database import Base


class TermoEliminacaoModel(Base):
    """
    Entidade Termo de Eliminação de Documentos (e-ARQ Brasil v2 - Cap. 3.2 & CONARQ).
    Impede a exclusão arbitrária sem rastro documental, preservando perpetuamente
    os metadados do documento eliminado, seu hash SHA-256 original, o motivo normativo,
    a justificativa técnica e o agente autorizador.
    """

    __tablename__ = "termos_eliminacao"

    id = Column(String(50), primary_key=True, index=True)
    numero_termo = Column(String(60), unique=True, index=True, nullable=False)
    documento_id = Column(String(50), index=True, nullable=False)
    numero_protocolo = Column(String(80), index=True, default="")
    nome_documento = Column(String(255), nullable=False)
    categoria = Column(String(100), default="")
    codigo_classificacao = Column(String(50), default="")
    nucleo = Column(String(255), default="")
    ano_documento = Column(Integer, default=0)
    status_documento_original = Column(String(50), default="ORIGINAL")
    hash_sha256_original = Column(String(64), default="")
    motivo_eliminacao = Column(String(80), nullable=False)
    justificativa = Column(Text, nullable=False)
    autorizado_por = Column(String(100), nullable=False)
    papel_autorizador = Column(String(50), nullable=False)
    data_eliminacao = Column(String(20), nullable=False)
    hora_eliminacao = Column(String(20), nullable=False)
    timestamp_iso = Column(String(40), index=True, nullable=False)
