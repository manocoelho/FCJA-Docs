import os
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

import database
from core.dependencies import exigir_papeis, extrair_agente_requisicao
from models.pacote_sip import PacoteSipModel
from services.archivematica_service import (
    criar_e_enviar_pacote_sip,
    listar_pacotes_sip,
    obter_config_archivematica_dict,
    salvar_config_archivematica,
    sincronizar_status_sip,
    testar_conexao_archivematica,
)

router = APIRouter()


class ConfigArchivematicaSchema(BaseModel):
    urlArchivematica: Optional[str] = None
    usuarioArchivematica: Optional[str] = None
    apiKeyArchivematica: Optional[str] = None
    locationUuidTransfer: Optional[str] = None
    diretorioCompartilhado: Optional[str] = None
    processingConfig: Optional[str] = None
    autoApprove: Optional[bool] = True
    urlAtom: Optional[str] = None


class CriarPacoteSipSchema(BaseModel):
    titulo: str
    documentoIds: List[str] = []
    dossieId: Optional[str] = None


class SincronizarSipSchema(BaseModel):
    confirmarAip: Optional[bool] = False


@router.get("/api/archivematica/config")
def obter_configuracao_conector():
    """Retorna a configuração atual do conector SIGAD FCJA -> Archivematica & AtoM."""
    with database.SessionLocal() as db:
        return obter_config_archivematica_dict(db)


@router.put("/api/archivematica/config")
def atualizar_configuracao_conector(
    dados: ConfigArchivematicaSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    """Atualiza os parâmetros de integração com os servidores Archivematica e AtoM."""
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Configuração do Conector Archivematica")
    ip = request.client.host if (request and request.client) else "127.0.0.1"

    with database.SessionLocal() as db:
        cfg = salvar_config_archivematica(
            db=db,
            dados=dados.model_dump(exclude_unset=True),
            usuario_responsavel=agente["nome"],
            ip_origem=ip,
        )
        return {
            "mensagem": "Configuração do conector Archivematica atualizada com sucesso.",
            "config": cfg,
        }


@router.post("/api/archivematica/testar-conexao")
def diagnosticar_conexao_archivematica():
    """Realiza diagnóstico de rede e diretório compartilhado com o servidor Archivematica."""
    with database.SessionLocal() as db:
        return testar_conexao_archivematica(db)


@router.get("/api/archivematica/sips")
def obter_pacotes_sip():
    """Lista todos os pacotes SIP OAIS gerados pelo SIGAD e o resumo de recolhimento RDC-Arq."""
    with database.SessionLocal() as db:
        return listar_pacotes_sip(db)


@router.post("/api/archivematica/sips")
def gerar_e_enviar_sip(
    dados: CriarPacoteSipSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    """
    Constrói um pacote SIP OAIS no padrão BagIt (RFC 8493) + metadata.csv (Dublin Core + e-ARQ v2)
    + METS + PREMIS e realiza o envio automático ao Archivematica.
    """
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Geração e Envio de Pacote SIP ao Archivematica")
    ip = request.client.host if (request and request.client) else "127.0.0.1"

    with database.SessionLocal() as db:
        try:
            pacote = criar_e_enviar_pacote_sip(
                db=db,
                pasta_dados=database.PASTA_DADOS,
                pasta_arquivos=database.PASTA_ARQUIVOS,
                titulo=dados.titulo,
                doc_ids=dados.documentoIds,
                dossie_id=dados.dossieId,
                usuario_responsavel=agente["nome"],
                ip_origem=ip,
            )
            return {
                "mensagem": f"Pacote SIP {pacote['codigoSip']} gerado e encaminhado com sucesso!",
                "pacote": pacote,
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/archivematica/sips/{sip_id}/sincronizar")
def sincronizar_pacote_sip(
    sip_id: int,
    dados: SincronizarSipSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    """Consulta o status do Transfer/Ingest no Archivematica ou homologa o AIP correspondente."""
    agente = extrair_agente_requisicao(authorization=authorization, papel_fallback="arquivista")
    exigir_papeis(agente, {"arquivista", "admin"}, "Sincronização/Homologação de Pacote SIP/AIP")
    ip = request.client.host if (request and request.client) else "127.0.0.1"

    with database.SessionLocal() as db:
        try:
            pacote = sincronizar_status_sip(
                db=db,
                sip_id=sip_id,
                confirmar_aip=bool(dados.confirmarAip),
                usuario_responsavel=agente["nome"],
                ip_origem=ip,
            )
            return {
                "mensagem": f"Status do pacote {pacote['codigoSip']} atualizado ({pacote['statusSip']}).",
                "pacote": pacote,
            }
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/archivematica/sips/{sip_id}/download")
def baixar_pacote_sip_zip(sip_id: int):
    """Faz o download do pacote BagIt (.zip) completo (objects + metadata.csv + METS + PREMIS)."""
    with database.SessionLocal() as db:
        sip = db.query(PacoteSipModel).filter(PacoteSipModel.id == sip_id).first()
        if not sip or not sip.caminho_zip or not os.path.isfile(sip.caminho_zip):
            raise HTTPException(
                status_code=404,
                detail="Arquivo compactado (.zip) do pacote SIP não encontrado em disco.",
            )
        caminho_zip = sip.caminho_zip
        codigo_sip = sip.codigo_sip

    return FileResponse(
        path=caminho_zip,
        media_type="application/zip",
        filename=f"{codigo_sip}.zip",
    )
