from sqlalchemy import Column, Integer, String
from database import Base


class DocumentoModel(Base):
    """
    Entidade Documento Arquivístico (e-ARQ Brasil v2 - Parte II).
    Preserva total retrocompatibilidade com a tabela 'documentos' original
    e adiciona os metadados obrigatórios de captura, contexto, acesso, fixidade,
    temporalidade (TTD) e vínculo orgânico com Dossiê/Processo.
    """

    __tablename__ = "documentos"

    id = Column(String(50), primary_key=True, index=True)
    numero_protocolo = Column(String(80), index=True, default="")

    # Relação Orgânica — Vínculo com Unidade de Arquivamento (Dossiê / Processo) (Fase 3)
    dossie_id = Column(String(50), index=True, default="")
    codigo_dossie = Column(String(80), default="")

    # Classificação e Contexto Organizacional
    tipo_atividade = Column(String(50), default="Atividade-Meio")
    codigo_classificacao = Column(String(50), default="")
    descricao_codigo = Column(String(255), default="")
    categoria = Column(String(100))
    ano = Column(Integer)
    nucleo = Column(String(255))
    sigla = Column(String(100), default="")

    # Metadados Intelectuais e de Contexto (e-ARQ Brasil v2 - Seção 1)
    nome = Column(String(255))
    autor = Column(String(255), default="Fundação Casa de José Américo (FCJA)")
    redator = Column(String(255), default="")
    originador = Column(String(255), default="")
    destinatario = Column(String(255), default="")
    genero = Column(String(100), default="Textual")
    status_documento = Column(String(50), default="ORIGINAL")  # MINUTA | ORIGINAL | COPIA
    meio = Column(String(50), default="DIGITAL")  # DIGITAL | NAO_DIGITAL | HIBRIDO
    fase_arquivistica = Column(String(50), default="CORRENTE")  # CORRENTE | INTERMEDIARIA | PERMANENTE

    # Temporalidade e Destinação (TTD - Fase 3)
    prazo_corrente_anos = Column(Integer, default=2)
    prazo_intermediaria_anos = Column(Integer, default=3)
    ano_destinacao_final = Column(Integer, default=2031)
    destinacao_prevista = Column(String(40), default="GUARDA_PERMANENTE")  # GUARDA_PERMANENTE | ELIMINACAO

    # Controle de Acesso e Sigilo (e-ARQ Brasil v2 - Cap. 7 / LAI & LGPD)
    nivel_acesso = Column(String(50), default="OSTENSIVO")  # OSTENSIVO | RESTRITO_LGPD | SIGILOSO_LAI
    hipotese_legal = Column(String(255), default="")

    # Metadados de Captura e Componente Digital Principal (PREMIS / e-ARQ Seção 3)
    ext = Column(String(20))
    formato_mime = Column(String(120), default="")
    upload = Column(String(20))
    hora = Column(String(20))
    url = Column(String(500))
    tamanho = Column(Integer, default=0)
    hash_sha256 = Column(String(64), index=True, default="")
    fixidade_verificada = Column(Integer, default=1)  # 1 = Íntegro, 0 = Divergente/Ausente
    ultima_verificacao_fixidade = Column(String(30), default="")
    usuario_captura = Column(String(100), default="sistema")
