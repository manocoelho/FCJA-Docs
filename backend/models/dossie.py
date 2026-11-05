from sqlalchemy import Column, Integer, String, Text
from database import Base


class UnidadeArquivamentoModel(Base):
    """
    Entidade Unidade de Arquivamento: Dossiê ou Processo (e-ARQ Brasil v2 Cap. 1.3, 5.2 e MER).
    Materializa a relação orgânica (vínculo arquivístico) entre os documentos produzidos
    em uma mesma pesquisa, projeto cultural ou processo administrativo da FCJA.
    """

    __tablename__ = "unidades_arquivamento"

    id = Column(String(50), primary_key=True, index=True)
    codigo_dossie = Column(String(80), unique=True, index=True, nullable=False)
    titulo = Column(String(255), nullable=False)
    tipo_unidade = Column(String(30), default="DOSSIE")  # DOSSIE | PROCESSO
    nucleo = Column(String(255), nullable=False)
    sigla_nucleo = Column(String(100), default="")
    codigo_classificacao = Column(String(50), default="")
    descricao_codigo = Column(String(255), default="")
    destinacao_prevista = Column(String(40), default="GUARDA_PERMANENTE")
    fase_atual = Column(String(30), default="CORRENTE")  # CORRENTE | INTERMEDIARIA | RECOLHIDO
    status_dossie = Column(String(30), default="ABERTO")  # ABERTO | ENCERRADO | RECOLHIDO_ARCHIVEMATICA
    volume_atual = Column(Integer, default=1)
    data_abertura = Column(String(20), nullable=False)
    data_encerramento = Column(String(20), default="")
    responsavel_abertura = Column(String(100), default="sistema")
    descricao = Column(Text, default="")
