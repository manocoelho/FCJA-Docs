from sqlalchemy import Column, Integer, String, Text
from database import Base


class PacoteSipModel(Base):
    """
    Pacote de Submissão de Informação (SIP - ISO 14721 OAIS / Resolução CONARQ nº 51/2023).
    Registra cada pacote BagIt (RFC 8493) gerado pelo SIGAD FCJA com metadados
    Dublin Core + e-ARQ Brasil v2 (metadata.csv), eventos PREMIS (premis_events.json)
    e manifesto METS (mets_earq_manifest.xml) para recolhimento ao Archivematica (RDC-Arq).
    """

    __tablename__ = "pacotes_sip_archivematica"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    codigo_sip = Column(String(80), unique=True, index=True, nullable=False)
    titulo = Column(String(255), nullable=False)

    # Vínculo opcional com Dossiê / Processo (Unidade de Arquivamento)
    dossie_id = Column(String(50), default="")
    codigo_dossie = Column(String(80), default="")
    nucleo = Column(String(255), default="")

    # Status no Pipeline OAIS (SIGAD -> Archivematica -> AIP)
    # EMPACOTADO_LOCAL | ENVIADO_ARCHIVEMATICA | EM_PROCESSAMENTO_AIP | ARMAZENADO_AIP | ERRO_TRANSMISSAO
    status_sip = Column(String(50), index=True, default="EMPACOTADO_LOCAL")
    transfer_uuid = Column(String(100), index=True, default="")
    aip_uuid = Column(String(100), index=True, default="")

    # Métricas e Integridade do Pacote BagIt (.zip)
    quantidade_documentos = Column(Integer, default=0)
    tamanho_total_bytes = Column(Integer, default=0)
    hash_manifesto_sha256 = Column(String(64), default="")
    caminho_zip = Column(String(500), default="")
    documentos_json = Column(Text, default="[]")

    # Metadados de Transmissão e Integração REST API
    modo_transmissao = Column(String(50), default="API_REST_V2")
    url_archivematica = Column(String(255), default="")
    mensagem_status = Column(Text, default="")
    usuario_responsavel = Column(String(100), default="arquivista")
    criado_em = Column(String(35), default="")
    atualizado_em = Column(String(35), default="")


class ConfigArchivematicaModel(Base):
    """
    Configuração do Conector de Interoperabilidade SIGAD FCJA -> Archivematica & AtoM.
    Mantém os parâmetros de conexão REST API v2beta, diretório compartilhado de Transfer
    e endereço do AtoM para difusão automática sem retrabalho de digitação.
    """

    __tablename__ = "config_archivematica"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    url_archivematica = Column(String(255), default="http://192.168.1.20:62080")
    usuario_archivematica = Column(String(100), default="fcja_sigad")
    api_key_archivematica = Column(String(255), default="")
    location_uuid_transfer = Column(String(100), default="")
    diretorio_compartilhado = Column(
        String(500), default="/var/archivematica/sharedDirectory/watchedDirectories/activeTransfers/standardTransfer"
    )
    processing_config = Column(String(100), default="automated")
    auto_approve = Column(Integer, default=1)
    url_atom = Column(String(255), default="http://192.168.1.21:80")
    atualizado_por = Column(String(100), default="sistema")
    atualizado_em = Column(String(35), default="")
