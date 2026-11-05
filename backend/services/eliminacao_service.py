import os
import uuid
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from models.documento import DocumentoModel
from models.componente_digital import ComponenteDigitalModel
from models.termo_eliminacao import TermoEliminacaoModel
from services.auditoria_service import registrar_evento


MOTIVOS_ELIMINACAO_VALIDOS = {
    "CUMPRIMENTO_PRAZO_TTD": "Cumprimento de Prazo de Guarda na TTD (Destinação Final)",
    "DUPLICIDADE_CAPTURA": "Duplicidade Comprovada de Captura no Acervo",
    "ERRO_MATERIAL_CAPTURA": "Erro Material / Inconsistência Técnica na Captura",
    "SUBSTITUICAO_FORMATO_PRESERVACAO": "Substituição por Formato de Preservação (Migração)",
    "DESCARTE_MINUTA_RASCUNHO": "Descarte de Minuta / Rascunho de Trabalho (Espaço de Grupo)",
}


def _gerar_numero_termo(db: Session, ano: int) -> str:
    prefixo = f"TERMO-ELIM-FCJA-{ano}-"
    existentes = (
        db.query(TermoEliminacaoModel.numero_termo)
        .filter(TermoEliminacaoModel.numero_termo.like(f"{prefixo}%"))
        .all()
    )
    maior = 0
    for (num,) in existentes:
        if num and num.startswith(prefixo):
            sufixo = num[len(prefixo) :]
            if sufixo.isdigit():
                maior = max(maior, int(sufixo))
    return f"{prefixo}{maior + 1:04d}"


def validar_governanca_eliminacao(
    doc: DocumentoModel,
    papel_usuario: str,
    motivo_eliminacao: str,
    justificativa: str,
) -> None:
    """
    Responsabilidade única: Aplicar a regra de imutabilidade e governança de eliminação
    do e-ARQ Brasil v2 (Cap. 2 e Cap. 3.2):
    - Documentos com status 'MINUTA' podem ser descartados por qualquer perfil autenticado.
    - Documentos capturados oficialmente ('ORIGINAL' ou 'COPIA') são protegidos contra
      exclusão arbitrária: somente 'arquivista' ou 'admin' podem autorizar sua eliminação,
      mediante motivo normativo e justificativa técnica formal.
    """
    status_doc = (doc.status_documento or "ORIGINAL").upper()
    papel = (papel_usuario or "pesquisador").lower().strip()
    justificativa_limpa = (justificativa or "").strip()

    if status_doc != "MINUTA":
        if papel not in ("arquivista", "admin"):
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Proteção de Imutabilidade e-ARQ Brasil v2: O documento '{doc.nome}' "
                    f"(Protocolo {doc.numero_protocolo or doc.id[:8]}) possui status '{status_doc}'. "
                    "Pesquisadores só podem descartar documentos em status 'MINUTA'. "
                    "A eliminação de documentos oficiais exige perfil 'Arquivista' ou 'Administrador' "
                    "com emissão de Termo de Eliminação."
                ),
            )
        if len(justificativa_limpa) < 10:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Governança e-ARQ Brasil v2: Para eliminar um documento oficial capturado, "
                    "é obrigatório informar uma justificativa técnica detalhada (mínimo de 10 caracteres) "
                    "para compor o Termo de Eliminação."
                ),
            )


def executar_eliminacao_controlada(
    db: Session,
    doc: DocumentoModel,
    caminho_fisico: str,
    usuario_responsavel: str,
    papel_usuario: str,
    motivo_eliminacao: str = "DESCARTE_MINUTA_RASCUNHO",
    justificativa: str = "",
    ip_origem: str = "",
) -> dict:
    """
    Responsabilidade única: Executar a eliminação controlada de um documento,
    gerando o Termo de Eliminação (TermoEliminacaoModel) e o evento de Ciclo de Vida
    (EarqEventoCv) antes de remover o arquivo físico.
    """
    validar_governanca_eliminacao(
        doc=doc,
        papel_usuario=papel_usuario,
        motivo_eliminacao=motivo_eliminacao,
        justificativa=justificativa,
    )

    agora = datetime.now()
    numero_termo = _gerar_numero_termo(db, agora.year)
    motivo_codigo = (
        motivo_eliminacao
        if motivo_eliminacao in MOTIVOS_ELIMINACAO_VALIDOS
        else "ERRO_MATERIAL_CAPTURA"
    )
    justificativa_final = (
        justificativa.strip()
        if justificativa and justificativa.strip()
        else "Descarte de minuta/rascunho em espaço de trabalho."
    )

    termo = TermoEliminacaoModel(
        id=str(uuid.uuid4()),
        numero_termo=numero_termo,
        documento_id=doc.id,
        numero_protocolo=doc.numero_protocolo or "",
        nome_documento=doc.nome or "",
        categoria=doc.categoria or "",
        codigo_classificacao=doc.codigo_classificacao or "",
        nucleo=doc.nucleo or "",
        ano_documento=doc.ano or agora.year,
        status_documento_original=doc.status_documento or "ORIGINAL",
        hash_sha256_original=doc.hash_sha256 or "",
        motivo_eliminacao=motivo_codigo,
        justificativa=justificativa_final,
        autorizado_por=usuario_responsavel or "sistema",
        papel_autorizador=papel_usuario or "arquivista",
        data_eliminacao=agora.strftime("%d/%m/%Y"),
        hora_eliminacao=agora.strftime("%H:%M:%S"),
        timestamp_iso=agora.isoformat(),
    )
    db.add(termo)

    if os.path.exists(caminho_fisico):
        os.remove(caminho_fisico)

    registrar_evento(
        db=db,
        categoria_evento="CICLO_VIDA",
        tipo_evento="ELIMINACAO_COM_TERMO",
        documento_id=doc.id,
        numero_protocolo=doc.numero_protocolo or "",
        usuario_responsavel=usuario_responsavel or "sistema",
        papel_usuario=papel_usuario or "",
        resultado="ALERTA",
        hash_evidencia=doc.hash_sha256 or "",
        ip_origem=ip_origem,
        detalhes=(
            f"[{numero_termo}] Documento '{doc.nome}' (Status: {doc.status_documento or 'ORIGINAL'}) "
            f"eliminado sob motivo '{MOTIVOS_ELIMINACAO_VALIDOS.get(motivo_codigo, motivo_codigo)}'. "
            f"Justificativa: {justificativa_final}"
        ),
    )

    db.query(ComponenteDigitalModel).filter(
        ComponenteDigitalModel.documento_id == doc.id
    ).delete()
    db.delete(doc)

    return {
        "numeroTermo": numero_termo,
        "documentoId": doc.id,
        "numeroProtocolo": doc.numero_protocolo or "",
        "nome": doc.nome or "",
        "motivoEliminacao": motivo_codigo,
        "justificativa": justificativa_final,
        "dataEliminacao": termo.data_eliminacao,
        "horaEliminacao": termo.hora_eliminacao,
    }


def listar_termos_eliminacao(db: Session, limite: int = 100) -> list[dict]:
    """
    Responsabilidade única: Listar os Termos de Eliminação emitidos pelo SIGAD.
    """
    termos = (
        db.query(TermoEliminacaoModel)
        .order_by(desc(TermoEliminacaoModel.timestamp_iso))
        .limit(max(1, min(limite, 300)))
        .all()
    )
    return [
        {
            "id": t.id,
            "numeroTermo": t.numero_termo,
            "documentoId": t.documento_id,
            "numeroProtocolo": t.numero_protocolo,
            "nomeDocumento": t.nome_documento,
            "categoria": t.categoria,
            "codigoClassificacao": t.codigo_classificacao,
            "nucleo": t.nucleo,
            "anoDocumento": t.ano_documento,
            "statusDocumentoOriginal": t.status_documento_original,
            "hashSha256Original": t.hash_sha256_original,
            "motivoEliminacao": t.motivo_eliminacao,
            "descricaoMotivo": MOTIVOS_ELIMINACAO_VALIDOS.get(
                t.motivo_eliminacao, t.motivo_eliminacao
            ),
            "justificativa": t.justificativa,
            "autorizadoPor": t.autorizado_por,
            "papelAutorizador": t.papel_autorizador,
            "dataEliminacao": t.data_eliminacao,
            "horaEliminacao": t.hora_eliminacao,
        }
        for t in termos
    ]
