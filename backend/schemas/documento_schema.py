from typing import Optional
from pydantic import BaseModel


class DocUpdateSchema(BaseModel):
    nome: str
    categoria: str
    ano: int
    nucleo: str
    descricao: Optional[str] = None
    autor: Optional[str] = None
    status_documento: Optional[str] = None
    nivel_acesso: Optional[str] = None
    hipotese_legal: Optional[str] = None
    previsao_desclassificacao: Optional[str] = None
    usuario_responsavel: Optional[str] = "sistema"
    papel_usuario: Optional[str] = ""


class AlteracaoSigiloSchema(BaseModel):
    nivel_acesso: str  # OSTENSIVO | RESTRITO_LGPD | SIGILOSO_LAI
    hipotese_legal: str = ""
    previsao_desclassificacao: str = ""
    justificativa: str
    usuario_responsavel: Optional[str] = "sistema"
    papel_usuario: Optional[str] = ""


class ReclassificacaoDocumentoSchema(BaseModel):
    codigo_classificacao: str
    descricao_codigo: str = ""
    tipo_atividade: str = "Atividade-Fim"
    justificativa: str
    usuario_responsavel: Optional[str] = "sistema"
    papel_usuario: Optional[str] = ""


class RegistroAcessoDocumentoSchema(BaseModel):
    tipo_acesso: str = "VISUALIZACAO"  # VISUALIZACAO | DOWNLOAD | INSPECAO_METADADOS
    usuario_responsavel: Optional[str] = "sistema"
    papel_usuario: Optional[str] = ""


class EliminacaoLoteSchema(BaseModel):
    ids_documentos: list[str]
    motivo_eliminacao: str = "CUMPRIMENTO_PRAZO_TTD"
    justificativa: str = ""
    usuario_responsavel: Optional[str] = "sistema"
    papel_usuario: Optional[str] = ""


class VerificacaoFixidadeResponseSchema(BaseModel):
    sucesso: bool
    documento_id: str
    numero_protocolo: str
    nome: str
    integro: bool
    status_fixidade: str
    hash_registrado: str
    hash_calculado: str
    verificado_em: str
    mensagem: str
