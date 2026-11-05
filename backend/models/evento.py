from sqlalchemy import Column, String, Text
from database import Base


class EventoArquivisticoModel(Base):
    """
    Trilha de Auditoria Imutável (Append-Only) baseada nas 4 categorias de Eventos
    do e-ARQ Brasil v2 (Parte II - Seções 2, 4 e 6):
    - CICLO_VIDA (EarqEventoCv): Captura, transferência, recolhimento, eliminação.
    - PROCEDIMENTAL (EarqEventoProc): Edição de metadados, visualização, login.
    - CLASSE (EarqEventoClasse): Alterações no Plano de Classificação e TTD.
    - PRESERVACAO (EarqEventoPreservacao / PREMIS): Cálculo de SHA-256, verificação de fixidade, validação de formato.
    """

    __tablename__ = "eventos_arquivisticos"

    id = Column(String(50), primary_key=True, index=True)
    categoria_evento = Column(String(40), index=True, nullable=False)
    tipo_evento = Column(String(60), index=True, nullable=False)
    documento_id = Column(String(50), index=True, default="")
    numero_protocolo = Column(String(80), index=True, default="")
    usuario_responsavel = Column(String(100), default="sistema")
    papel_usuario = Column(String(50), default="")
    data_evento = Column(String(20), nullable=False)
    hora_evento = Column(String(20), nullable=False)
    timestamp_iso = Column(String(40), index=True, nullable=False)
    resultado = Column(String(30), default="SUCESSO")  # SUCESSO | ALERTA | FALHA
    detalhes = Column(Text, default="")
    hash_evidencia = Column(String(64), default="")
    ip_origem = Column(String(60), default="")
