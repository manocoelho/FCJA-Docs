from typing import Optional
from pydantic import BaseModel


class DocUpdateSchema(BaseModel):
    nome: str
    categoria: str
    ano: int
    nucleo: str
    autor: Optional[str] = None
    status_documento: Optional[str] = None
    nivel_acesso: Optional[str] = None
    hipotese_legal: Optional[str] = None
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
