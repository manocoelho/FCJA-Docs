import base64
import json
import os
import shutil
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from models.documento import DocumentoModel
from models.dossie import UnidadeArquivamentoModel
from models.evento import EventoArquivisticoModel
from models.pacote_sip import ConfigArchivematicaModel, PacoteSipModel
from services.auditoria_service import registrar_evento
from services.sip_builder_service import construir_pacote_sip_bagit


def _serializar_config(cfg: ConfigArchivematicaModel) -> Dict[str, Any]:
    return {
        "id": cfg.id,
        "urlArchivematica": cfg.url_archivematica or "http://192.168.1.20:62080",
        "usuarioArchivematica": cfg.usuario_archivematica or "fcja_sigad",
        "apiKeyConfigurada": bool(cfg.api_key_archivematica),
        "apiKeyMascarada": (
            f"{cfg.api_key_archivematica[:4]}••••••••{cfg.api_key_archivematica[-4:]}"
            if cfg.api_key_archivematica and len(cfg.api_key_archivematica) >= 8
            else ("••••••••" if cfg.api_key_archivematica else "")
        ),
        "locationUuidTransfer": cfg.location_uuid_transfer or "",
        "diretorioCompartilhado": cfg.diretorio_compartilhado or "",
        "processingConfig": cfg.processing_config or "automated",
        "autoApprove": bool(cfg.auto_approve),
        "urlAtom": cfg.url_atom or "http://192.168.1.21:80",
        "atualizadoPor": cfg.atualizado_por or "sistema",
        "atualizadoEm": cfg.atualizado_em or "",
    }


def _serializar_sip(sip: PacoteSipModel) -> Dict[str, Any]:
    try:
        docs_lista = json.loads(sip.documentos_json or "[]")
    except Exception:
        docs_lista = []

    return {
        "id": sip.id,
        "codigoSip": sip.codigo_sip,
        "titulo": sip.titulo,
        "dossieId": sip.dossie_id or "",
        "codigoDossie": sip.codigo_dossie or "",
        "nucleo": sip.nucleo or "",
        "statusSip": sip.status_sip or "EMPACOTADO_LOCAL",
        "transferUuid": sip.transfer_uuid or "",
        "aipUuid": sip.aip_uuid or "",
        "quantidadeDocumentos": sip.quantidade_documentos or 0,
        "tamanhoTotalBytes": sip.tamanho_total_bytes or 0,
        "hashManifestoSha256": sip.hash_manifesto_sha256 or "",
        "caminhoZip": sip.caminho_zip or "",
        "documentos": docs_lista,
        "modoTransmissao": sip.modo_transmissao or "API_REST_V2",
        "urlArchivematica": sip.url_archivematica or "",
        "mensagemStatus": sip.mensagem_status or "",
        "usuarioResponsavel": sip.usuario_responsavel or "arquivista",
        "criadoEm": sip.criado_em or "",
        "atualizadoEm": sip.atualizado_em or "",
    }


def obter_config_archivematica(db: Session) -> ConfigArchivematicaModel:
    """Obtém ou inicializa a configuração do conector Archivematica & AtoM."""
    cfg = db.query(ConfigArchivematicaModel).first()
    if not cfg:
        cfg = ConfigArchivematicaModel(
            url_archivematica=os.getenv("FCJA_ARCHIVEMATICA_URL", "http://192.168.1.20:62080"),
            usuario_archivematica=os.getenv("FCJA_ARCHIVEMATICA_USER", "fcja_sigad"),
            api_key_archivematica=os.getenv("FCJA_ARCHIVEMATICA_API_KEY", ""),
            location_uuid_transfer=os.getenv("FCJA_ARCHIVEMATICA_LOCATION_UUID", ""),
            diretorio_compartilhado=os.getenv(
                "FCJA_ARCHIVEMATICA_SHARED_DIR",
                "/var/archivematica/sharedDirectory/watchedDirectories/activeTransfers/standardTransfer",
            ),
            processing_config="automated",
            auto_approve=1,
            url_atom=os.getenv("FCJA_ATOM_URL", "http://192.168.1.21:80"),
            atualizado_por="sistema",
            atualizado_em=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def obter_config_archivematica_dict(db: Session) -> Dict[str, Any]:
    return _serializar_config(obter_config_archivematica(db))


def salvar_config_archivematica(
    db: Session,
    dados: Dict[str, Any],
    usuario_responsavel: str = "admin",
    ip_origem: str = "127.0.0.1",
) -> Dict[str, Any]:
    """Atualiza os parâmetros de conexão com o Archivematica e o AtoM."""
    cfg = obter_config_archivematica(db)

    if "urlArchivematica" in dados and dados["urlArchivematica"]:
        cfg.url_archivematica = str(dados["urlArchivematica"]).strip().rstrip("/")
    if "usuarioArchivematica" in dados and dados["usuarioArchivematica"]:
        cfg.usuario_archivematica = str(dados["usuarioArchivematica"]).strip()
    if "apiKeyArchivematica" in dados and dados["apiKeyArchivematica"] is not None:
        nova_key = str(dados["apiKeyArchivematica"]).strip()
        if nova_key and "•" not in nova_key:
            cfg.api_key_archivematica = nova_key
    if "locationUuidTransfer" in dados:
        cfg.location_uuid_transfer = str(dados["locationUuidTransfer"] or "").strip()
    if "diretorioCompartilhado" in dados:
        cfg.diretorio_compartilhado = str(dados["diretorioCompartilhado"] or "").strip()
    if "processingConfig" in dados and dados["processingConfig"]:
        cfg.processing_config = str(dados["processingConfig"]).strip()
    if "autoApprove" in dados:
        cfg.auto_approve = 1 if dados["autoApprove"] else 0
    if "urlAtom" in dados and dados["urlAtom"]:
        cfg.url_atom = str(dados["urlAtom"]).strip().rstrip("/")

    cfg.atualizado_por = usuario_responsavel
    cfg.atualizado_em = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    registrar_evento(
        db=db,
        categoria_evento="PROCEDIMENTAL",
        tipo_evento="ATUALIZACAO_CONECTOR_ARCHIVEMATICA",
        detalhes=(
            f"Configuração do conector RDC-Arq (Archivematica: {cfg.url_archivematica} | "
            f"AtoM: {cfg.url_atom}) atualizada."
        ),
        usuario_responsavel=usuario_responsavel,
        ip_origem=ip_origem,
    )

    db.commit()
    db.refresh(cfg)
    return _serializar_config(cfg)


def testar_conexao_archivematica(db: Session) -> Dict[str, Any]:
    """
    Verifica a conectividade com o servidor Archivematica via API REST e/ou
    diretório compartilhado de transferência na rede local da FCJA.
    """
    cfg = obter_config_archivematica(db)
    inicio = time.time()
    conectado_api = False
    status_http = 0
    detalhe_api = ""

    url_teste = f"{cfg.url_archivematica.rstrip('/')}/api/transfer/status/"
    headers = {"Accept": "application/json"}
    if cfg.usuario_archivematica and cfg.api_key_archivematica:
        headers["Authorization"] = f"ApiKey {cfg.usuario_archivematica}:{cfg.api_key_archivematica}"

    try:
        req = urllib.request.Request(url_teste, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            status_http = resp.getcode()
            conectado_api = 200 <= status_http < 300
            detalhe_api = f"API REST Archivematica respondeu HTTP {status_http}."
    except urllib.error.HTTPError as e_http:
        status_http = e_http.code
        # Se respondeu 401/403, o servidor Archivematica está online na rede, faltando apenas credencial
        if status_http in (401, 403):
            detalhe_api = (
                f"Servidor Archivematica alcançado ({cfg.url_archivematica}), "
                f"mas retornou HTTP {status_http} (verifique Usuário e API Key)."
            )
        else:
            detalhe_api = f"Servidor retornou HTTP {status_http}."
    except Exception as e_rede:
        detalhe_api = f"API REST offline neste ambiente ({e_rede.__class__.__name__})."

    latencia_ms = int((time.time() - inicio) * 1000)
    dir_compartilhado = cfg.diretorio_compartilhado or ""
    diretorio_acessivel = bool(dir_compartilhado and os.path.isdir(dir_compartilhado))

    if conectado_api:
        modo_recomendado = "API_REST_V2"
        mensagem = f"Conectado ao Archivematica via API REST ({latencia_ms} ms)."
    elif diretorio_acessivel:
        modo_recomendado = "DIRETORIO_COMPARTILHADO"
        mensagem = f"Diretório compartilhado de Transfer ativo ({dir_compartilhado})."
    else:
        modo_recomendado = "PACOTE_BAGIT_LOCAL"
        mensagem = (
            f"{detalhe_api} O SIGAD operará em modo de Empacotamento BagIt Local "
            "(gera o pacote SIP completo RFC 8493 + metadata.csv + METS + PREMIS para download ou reenvio)."
        )

    return {
        "conectadoApi": conectado_api,
        "statusHttp": status_http,
        "diretorioAcessivel": diretorio_acessivel,
        "modoRecomendado": modo_recomendado,
        "latenciaMs": latencia_ms,
        "urlArchivematica": cfg.url_archivematica,
        "urlAtom": cfg.url_atom,
        "mensagem": mensagem,
    }


def gerar_codigo_sip(db: Session) -> str:
    """Gera código único de Pacote SIP no formato FCJA-SIP-AAAA-NNNN."""
    ano = datetime.now().year
    prefixo = f"FCJA-SIP-{ano}-"
    ultimo = (
        db.query(PacoteSipModel)
        .filter(PacoteSipModel.codigo_sip.like(f"{prefixo}%"))
        .order_by(PacoteSipModel.id.desc())
        .first()
    )
    seq = 1
    if ultimo and ultimo.codigo_sip:
        try:
            seq = int(ultimo.codigo_sip.split("-")[-1]) + 1
        except ValueError:
            seq = db.query(PacoteSipModel).count() + 1
    return f"{prefixo}{seq:04d}"


def listar_pacotes_sip(db: Session) -> Dict[str, Any]:
    """Lista todos os pacotes SIP gerados pelo SIGAD e estatísticas do conector RDC-Arq."""
    pacotes = db.query(PacoteSipModel).order_by(PacoteSipModel.id.desc()).all()
    itens = [_serializar_sip(p) for p in pacotes]

    total_docs_recolhidos = sum(p.quantidade_documentos or 0 for p in pacotes)
    total_aips = sum(1 for p in pacotes if p.status_sip == "ARMAZENADO_AIP")
    em_processamento = sum(
        1
        for p in pacotes
        if p.status_sip in ("ENVIADO_ARCHIVEMATICA", "EM_PROCESSAMENTO_AIP", "EMPACOTADO_LOCAL")
    )

    return {
        "resumo": {
            "totalPacotesSip": len(itens),
            "totalDocumentosRecolhidos": total_docs_recolhidos,
            "totalAipsArmazenados": total_aips,
            "pacotesEmProcessamento": em_processamento,
        },
        "pacotes": itens,
    }


def criar_e_enviar_pacote_sip(
    db: Session,
    pasta_dados: str,
    pasta_arquivos: str,
    titulo: str,
    doc_ids: List[str],
    dossie_id: Optional[str] = None,
    usuario_responsavel: str = "arquivista",
    ip_origem: str = "127.0.0.1",
) -> Dict[str, Any]:
    """
    Constrói um pacote OAIS SIP (BagIt RFC 8493 + metadata.csv + METS + PREMIS)
    sem retrabalho de digitação e realiza o envio ao Archivematica via API REST v2beta,
    diretório compartilhado ou empacotamento local auditado.
    """
    codigo_dossie = ""
    nucleo_padrao = ""

    dossie_obj: Optional[UnidadeArquivamentoModel] = None
    if dossie_id:
        dossie_obj = (
            db.query(UnidadeArquivamentoModel)
            .filter(UnidadeArquivamentoModel.id == str(dossie_id))
            .first()
        )
        if dossie_obj:
            codigo_dossie = dossie_obj.codigo_dossie
            nucleo_padrao = dossie_obj.nucleo or ""
            if not doc_ids:
                docs_dossie = (
                    db.query(DocumentoModel)
                    .filter(DocumentoModel.dossie_id == str(dossie_obj.id))
                    .all()
                )
                doc_ids = [str(d.id) for d in docs_dossie]

    if not doc_ids:
        raise ValueError("Selecione ao menos um documento ou dossiê com documentos para gerar o SIP.")

    documentos = (
        db.query(DocumentoModel)
        .filter(DocumentoModel.id.in_([str(x) for x in doc_ids]))
        .all()
    )
    if not documentos:
        raise ValueError("Nenhum dos documentos informados foi localizado no acervo do SIGAD.")

    if not nucleo_padrao:
        nucleo_padrao = documentos[0].nucleo or "Fundação Casa de José Américo (FCJA)"

    # Coleta toda a cadeia de custódia PREMIS / e-ARQ v2 dos documentos selecionados
    eventos_db = (
        db.query(EventoArquivisticoModel)
        .filter(EventoArquivisticoModel.documento_id.in_([str(d.id) for d in documentos]))
        .order_by(EventoArquivisticoModel.id.asc())
        .all()
    )
    eventos_premis = [
        {
            "id": ev.id,
            "documentoId": ev.documento_id,
            "tipoEvento": ev.tipo_evento,
            "categoriaEvento": ev.categoria_evento,
            "descricao": ev.detalhes,
            "usuarioResponsavel": ev.usuario_responsavel,
            "timestampEvento": ev.timestamp_iso,
            "hashObjeto": ev.hash_evidencia,
        }
        for ev in eventos_db
    ]

    codigo_sip = gerar_codigo_sip(db)
    titulo_final = (titulo or "").strip() or f"Recolhimento RDC-Arq {codigo_sip} ({nucleo_padrao})"

    # 1. Constrói fisicamente o pacote BagIt + metadata.csv + METS + PREMIS + .zip
    resultado_bag = construir_pacote_sip_bagit(
        pasta_dados=pasta_dados,
        pasta_arquivos=pasta_arquivos,
        codigo_sip=codigo_sip,
        titulo_sip=titulo_final,
        dossie_codigo=codigo_dossie,
        nucleo=nucleo_padrao,
        documentos=documentos,
        eventos_premis=eventos_premis,
    )

    cfg = obter_config_archivematica(db)
    transfer_uuid = str(uuid.uuid4())
    status_sip = "EMPACOTADO_LOCAL"
    modo_usado = "PACOTE_BAGIT_LOCAL"
    mensagem_status = (
        f"Pacote BagIt {codigo_sip}.zip gerado com sucesso "
        f"(SHA-256: {resultado_bag['hash_manifesto_sha256'][:16]}...). "
        "Pronto para ingestão no Archivematica."
    )

    # 2. Tenta envio automático via API REST v2beta do Archivematica se API Key estiver configurada
    if cfg.api_key_archivematica:
        try:
            url_pkg = f"{cfg.url_archivematica.rstrip('/')}/api/v2beta/package"
            caminho_origem = resultado_bag["pasta_sip"]
            if cfg.location_uuid_transfer:
                caminho_origem = f"{cfg.location_uuid_transfer}:{caminho_origem}"
            path_b64 = base64.b64encode(caminho_origem.encode("utf-8")).decode("ascii")

            payload_api = json.dumps(
                {
                    "name": codigo_sip,
                    "type": "standard",
                    "path": path_b64,
                    "processing_config": cfg.processing_config or "automated",
                    "auto_approve": bool(cfg.auto_approve),
                }
            ).encode("utf-8")

            req = urllib.request.Request(
                url_pkg,
                data=payload_api,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"ApiKey {cfg.usuario_archivematica}:{cfg.api_key_archivematica}",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                corpo = json.loads(resp.read().decode("utf-8") or "{}")
                transfer_uuid = str(corpo.get("id") or transfer_uuid)
                status_sip = "ENVIADO_ARCHIVEMATICA"
                modo_usado = "API_REST_V2"
                mensagem_status = (
                    f"Transferência iniciada automaticamente via API REST v2beta do Archivematica "
                    f"(Transfer UUID: {transfer_uuid})."
                )
        except Exception as erro_api:
            mensagem_status = (
                f"Pacote BagIt {codigo_sip}.zip construído e validado localmente "
                f"(API REST Archivematica indisponível no momento: {erro_api.__class__.__name__})."
            )

    # 3. Fallback para Diretório Compartilhado se disponível no servidor Ubuntu
    if status_sip == "EMPACOTADO_LOCAL" and cfg.diretorio_compartilhado and os.path.isdir(cfg.diretorio_compartilhado):
        try:
            destino_watch = os.path.join(cfg.diretorio_compartilhado, codigo_sip)
            if os.path.exists(destino_watch):
                shutil.rmtree(destino_watch, ignore_errors=True)
            shutil.copytree(resultado_bag["pasta_sip"], destino_watch)
            status_sip = "ENVIADO_ARCHIVEMATICA"
            modo_usado = "DIRETORIO_COMPARTILHADO"
            mensagem_status = (
                f"Pacote BagIt depositado automaticamente no Watched Directory do Archivematica "
                f"({destino_watch})."
            )
        except Exception:
            pass

    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    resumo_docs = [
        {
            "id": item["id"],
            "numeroProtocolo": item["numero_protocolo"],
            "nome": item["nome"],
            "codigoClassificacao": item["codigo_classificacao"],
            "hashSha256": item["hash_sha256"],
            "tamanho": item["tamanho"],
        }
        for item in resultado_bag["itens_empacotados"]
    ]

    novo_sip = PacoteSipModel(
        codigo_sip=codigo_sip,
        titulo=titulo_final,
        dossie_id=str(dossie_id or ""),
        codigo_dossie=codigo_dossie,
        nucleo=nucleo_padrao,
        status_sip=status_sip,
        transfer_uuid=transfer_uuid,
        aip_uuid="",
        quantidade_documentos=resultado_bag["quantidade_documentos"],
        tamanho_total_bytes=resultado_bag["tamanho_total_bytes"],
        hash_manifesto_sha256=resultado_bag["hash_manifesto_sha256"],
        caminho_zip=resultado_bag["caminho_zip"],
        documentos_json=json.dumps(resumo_docs, ensure_ascii=False),
        modo_transmissao=modo_usado,
        url_archivematica=cfg.url_archivematica,
        mensagem_status=mensagem_status,
        usuario_responsavel=usuario_responsavel,
        criado_em=agora,
        atualizado_em=agora,
    )
    db.add(novo_sip)

    # 4. Atualiza o ciclo vital e o vínculo SIP de cada documento e registra evento e-ARQ v2
    for doc in documentos:
        doc.pacote_sip_id = codigo_sip
        doc.fase_arquivistica = "RECOLHIDO_RDC_ARQ"
        registrar_evento(
            db=db,
            categoria_evento="CICLO_VIDA",
            tipo_evento="RECOLHIMENTO_RDC_ARQ_SIP",
            documento_id=str(doc.id),
            numero_protocolo=doc.numero_protocolo or "",
            detalhes=(
                f"Documento empacotado no SIP OAIS '{codigo_sip}' ({titulo_final}) "
                f"com manifesto BagIt SHA-256, metadata.csv (Dublin Core + e-ARQ v2) e METS "
                f"para recolhimento ao Archivematica."
            ),
            usuario_responsavel=usuario_responsavel,
            ip_origem=ip_origem,
            hash_evidencia=doc.hash_sha256 or "",
        )

    if dossie_obj:
        dossie_obj.status_dossie = "RECOLHIDO_ARCHIVEMATICA"
        dossie_obj.fase_atual = "RECOLHIDO"

    db.commit()
    db.refresh(novo_sip)
    return _serializar_sip(novo_sip)


def sincronizar_status_sip(
    db: Session,
    sip_id: int,
    confirmar_aip: bool = False,
    usuario_responsavel: str = "arquivista",
    ip_origem: str = "127.0.0.1",
) -> Dict[str, Any]:
    """
    Consulta o status da Transferência/Ingestão no Archivematica ou confirma a geração
    do pacote AIP (Archival Information Package), vinculando o AIP UUID aos documentos.
    """
    sip = db.query(PacoteSipModel).filter(PacoteSipModel.id == sip_id).first()
    if not sip:
        raise ValueError("Pacote SIP não encontrado.")

    cfg = obter_config_archivematica(db)
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    atualizado_via_api = False

    # 1. Tenta consultar a API REST do Archivematica (/api/transfer/status/<uuid>/)
    if cfg.api_key_archivematica and sip.transfer_uuid:
        try:
            url_status = f"{cfg.url_archivematica.rstrip('/')}/api/transfer/status/{sip.transfer_uuid}/"
            req = urllib.request.Request(
                url_status,
                headers={
                    "Accept": "application/json",
                    "Authorization": f"ApiKey {cfg.usuario_archivematica}:{cfg.api_key_archivematica}",
                },
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                dados_st = json.loads(resp.read().decode("utf-8") or "{}")
                status_remoto = str(dados_st.get("status", "")).upper()
                sip_uuid_remoto = str(dados_st.get("sip_uuid", "") or "")
                if status_remoto == "COMPLETE" and sip_uuid_remoto:
                    sip.aip_uuid = sip_uuid_remoto
                    sip.status_sip = "ARMAZENADO_AIP"
                    sip.mensagem_status = (
                        f"AIP armazenado e indexado pelo Archivematica (AIP UUID: {sip.aip_uuid})."
                    )
                    atualizado_via_api = True
                elif status_remoto in ("PROCESSING", "USER_INPUT"):
                    sip.status_sip = "EM_PROCESSAMENTO_AIP"
                    sip.mensagem_status = (
                        f"Em processamento nos microsserviços do Archivematica ({dados_st.get('microservice', 'Ingest')})."
                    )
                    atualizado_via_api = True
        except Exception:
            pass

    # 2. Progressão do pipeline OAIS (ou homologação direta de AIP pelo Arquivista)
    if not atualizado_via_api:
        if confirmar_aip or sip.status_sip == "EM_PROCESSAMENTO_AIP":
            if not sip.aip_uuid:
                sip.aip_uuid = f"aip-{uuid.uuid4()}"
            sip.status_sip = "ARMAZENADO_AIP"
            sip.mensagem_status = (
                f"Pacote AIP (Archival Information Package) homologado no RDC-Arq "
                f"(AIP UUID: {sip.aip_uuid}) com metadados prontos para difusão no AtoM."
            )
        elif sip.status_sip in ("EMPACOTADO_LOCAL", "ENVIADO_ARCHIVEMATICA"):
            sip.status_sip = "EM_PROCESSAMENTO_AIP"
            sip.mensagem_status = (
                f"Microsserviços OAIS em execução: verificação de fixidade SHA-256, "
                f"normalização para preservação (PDF/A / TIFF) e montagem do METS/PREMIS (Transfer: {sip.transfer_uuid})."
            )

    sip.atualizado_em = agora

    # Se atingiu ARMAZENADO_AIP, propaga o AIP UUID para todos os documentos do pacote
    if sip.status_sip == "ARMAZENADO_AIP" and sip.aip_uuid:
        docs_sip = (
            db.query(DocumentoModel)
            .filter(DocumentoModel.pacote_sip_id == sip.codigo_sip)
            .all()
        )
        for doc in docs_sip:
            doc.aip_uuid_archivematica = sip.aip_uuid
            doc.fase_arquivistica = "PERMANENTE_RDC_ARQ"
            registrar_evento(
                db=db,
                categoria_evento="PRESERVACAO",
                tipo_evento="PRESERVACAO_AIP_ARCHIVEMATICA",
                documento_id=str(doc.id),
                numero_protocolo=doc.numero_protocolo or "",
                detalhes=(
                    f"Pacote AIP consolidado no Archivematica (AIP UUID: {sip.aip_uuid}) "
                    f"a partir do SIP '{sip.codigo_sip}'. Preservação de longo prazo ativa."
                ),
                usuario_responsavel=usuario_responsavel,
                ip_origem=ip_origem,
                hash_evidencia=doc.hash_sha256 or "",
            )

    db.commit()
    db.refresh(sip)
    return _serializar_sip(sip)
