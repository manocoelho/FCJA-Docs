from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, Header, HTTPException, Request, Query
from fastapi.responses import FileResponse
import os
import shutil
import uuid
import urllib.parse
import re
from datetime import datetime
import pandas as pd
import platform

import database
from models.documento import DocumentoModel
from models.componente_digital import ComponenteDigitalModel
from models.dossie import UnidadeArquivamentoModel
from schemas.documento_schema import DocUpdateSchema, EliminacaoLoteSchema
from core.dependencies import extrair_agente_requisicao
from services.fixidade_service import (
    calcular_hash_sha256,
    identificar_formato_e_genero,
    verificar_fixidade_arquivo,
)
from services.protocolo_service import gerar_numero_protocolo
from services.auditoria_service import registrar_evento
from services.eliminacao_service import executar_eliminacao_controlada
from services.temporalidade_service import calcular_temporalidade_documento

router = APIRouter()


def limpar_nome_pasta(texto: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", texto or "")


def get_base_url(request: Request = None) -> str:
    if request:
        return str(request.base_url).rstrip("/")
    return "http://localhost:8000"


def get_ip_cliente(request: Request = None) -> str:
    if request and request.client:
        return request.client.host or ""
    return ""


def montar_caminho_fisico(doc: DocumentoModel) -> str:
    return os.path.join(
        database.PASTA_ARQUIVOS,
        limpar_nome_pasta(doc.nucleo),
        str(doc.ano),
        limpar_nome_pasta(doc.categoria),
        limpar_nome_pasta(doc.nome),
    )


@router.get("/api/documentos")
def listar_documentos(request: Request = None):
    base_atual = get_base_url(request)
    documentos_formatados = []

    with database.SessionLocal() as db:
        documentos = db.query(DocumentoModel).all()
        for doc in documentos:
            url_doc = doc.url or ""
            if request and url_doc and "localhost:8000" in url_doc and "localhost:8000" not in base_atual:
                url_doc = url_doc.replace("http://localhost:8000", base_atual)

            documentos_formatados.append({
                "id": doc.id or "",
                "numeroProtocolo": doc.numero_protocolo or "",
                "dossieId": doc.dossie_id or "",
                "codigoDossie": doc.codigo_dossie or "",
                "nome": doc.nome or "",
                "ext": doc.ext or "",
                "categoria": doc.categoria or "",
                "ano": doc.ano or 0,
                "nucleo": doc.nucleo or "",
                "sigla": doc.sigla or "",
                "upload": doc.upload or "",
                "hora": doc.hora or "",
                "url": url_doc,
                "tamanho": doc.tamanho or 0,
                "tipoAtividade": doc.tipo_atividade or "",
                "codigoClassificacao": doc.codigo_classificacao or "",
                "descricaoCodigo": doc.descricao_codigo or "",
                # Metadados e-ARQ Brasil v2, TTD & PREMIS
                "autor": doc.autor or "Fundação Casa de José Américo (FCJA)",
                "redator": doc.redator or "",
                "originador": doc.originador or "",
                "destinatario": doc.destinatario or "",
                "genero": doc.genero or "Textual",
                "statusDocumento": doc.status_documento or "ORIGINAL",
                "meio": doc.meio or "DIGITAL",
                "faseArquivistica": doc.fase_arquivistica or "CORRENTE",
                "prazoCorrenteAnos": doc.prazo_corrente_anos if doc.prazo_corrente_anos is not None else 2,
                "prazoIntermediariaAnos": doc.prazo_intermediaria_anos if doc.prazo_intermediaria_anos is not None else 3,
                "anoDestinacaoFinal": doc.ano_destinacao_final or ((doc.ano or 2026) + 5),
                "destinacaoPrevista": doc.destinacao_prevista or "GUARDA_PERMANENTE",
                "nivelAcesso": doc.nivel_acesso or "OSTENSIVO",
                "hipoteseLegal": doc.hipotese_legal or "",
                "formatoMime": doc.formato_mime or "",
                "hashSha256": doc.hash_sha256 or "",
                "fixidadeVerificada": bool(doc.fixidade_verificada) if doc.fixidade_verificada is not None else True,
                "ultimaVerificacaoFixidade": doc.ultima_verificacao_fixidade or "",
                "usuarioCaptura": doc.usuario_captura or "sistema",
                "pacoteSipId": doc.pacote_sip_id or "",
                "aipUuidArchivematica": doc.aip_uuid_archivematica or "",
            })

    return documentos_formatados


@router.post("/api/upload")
def upload_documento(
    file: UploadFile = File(...),
    nome: str = Form(...),
    ext: str = Form(...),
    tipo_atividade: str = Form(""),
    codigo_classificacao: str = Form(""),
    descricao_codigo: str = Form(""),
    categoria: str = Form(...),
    ano: int = Form(...),
    nucleo: str = Form(...),
    sigla: str = Form(""),
    dossie_id: str = Form(""),
    autor: str = Form("Fundação Casa de José Américo (FCJA)"),
    redator: str = Form(""),
    originador: str = Form(""),
    destinatario: str = Form(""),
    status_documento: str = Form("ORIGINAL"),
    meio: str = Form("DIGITAL"),
    nivel_acesso: str = Form("OSTENSIVO"),
    hipotese_legal: str = Form(""),
    usuario_responsavel: str = Form("sistema"),
    papel_usuario: str = Form(""),
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(
        authorization=authorization,
        usuario_fallback=usuario_responsavel,
        papel_fallback=papel_usuario,
    )
    responsavel_efetivo = agente["nome"]
    papel_efetivo = agente["papel"]

    nucleo_limpo = limpar_nome_pasta(nucleo)
    categoria_limpa = limpar_nome_pasta(categoria)
    nome_limpo = limpar_nome_pasta(nome)

    subpasta = os.path.join(database.PASTA_ARQUIVOS, nucleo_limpo, str(ano), categoria_limpa)
    os.makedirs(subpasta, exist_ok=True)

    caminho_fisico = os.path.join(subpasta, nome_limpo)
    with open(caminho_fisico, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    tamanho_bytes = os.path.getsize(caminho_fisico)
    hash_sha256 = calcular_hash_sha256(caminho_fisico)
    formato_mime, genero_doc = identificar_formato_e_genero(caminho_fisico, ext)

    doc_id = str(uuid.uuid4())
    agora = datetime.now()
    data_upload = agora.strftime("%d/%m/%Y")
    hora_upload = agora.strftime("%H:%M:%S")
    data_hora_str = f"{data_upload} {hora_upload}"

    base_atual = get_base_url(request)
    caminho_relativo = f"{nucleo_limpo}/{ano}/{categoria_limpa}/{nome_limpo}"
    url_nova = f"{base_atual}/arquivos/{urllib.parse.quote(caminho_relativo)}"
    ip_cliente = get_ip_cliente(request)

    with database.SessionLocal() as db:
        numero_protocolo = gerar_numero_protocolo(db=db, sigla=sigla, nucleo=nucleo, ano=ano)
        calc_ttd = calcular_temporalidade_documento(
            db=db,
            ano_producao=ano,
            codigo_classificacao=codigo_classificacao,
            tipo_atividade=tipo_atividade,
            categoria=categoria,
        )

        # Vinculação orgânica com Dossiê / Processo (Unidade de Arquivamento)
        dossie_vinculado = None
        if dossie_id:
            dossie_vinculado = (
                db.query(UnidadeArquivamentoModel)
                .filter(UnidadeArquivamentoModel.id == dossie_id)
                .first()
            )
        if not dossie_vinculado and nucleo:
            dossie_vinculado = (
                db.query(UnidadeArquivamentoModel)
                .filter(
                    UnidadeArquivamentoModel.nucleo == nucleo,
                    UnidadeArquivamentoModel.status_dossie == "ABERTO",
                )
                .first()
            )

        dossie_id_final = dossie_vinculado.id if dossie_vinculado else ""
        codigo_dossie_final = dossie_vinculado.codigo_dossie if dossie_vinculado else ""

        novo_doc = DocumentoModel(
            id=doc_id,
            numero_protocolo=numero_protocolo,
            dossie_id=dossie_id_final,
            codigo_dossie=codigo_dossie_final,
            tipo_atividade=tipo_atividade,
            codigo_classificacao=codigo_classificacao,
            descricao_codigo=descricao_codigo,
            nome=nome,
            ext=ext,
            categoria=categoria,
            ano=ano,
            nucleo=nucleo,
            sigla=sigla,
            upload=data_upload,
            hora=hora_upload,
            url=url_nova,
            tamanho=tamanho_bytes,
            autor=autor or "Fundação Casa de José Américo (FCJA)",
            redator=redator or "",
            originador=originador or "",
            destinatario=destinatario or "",
            genero=genero_doc,
            status_documento=status_documento or "ORIGINAL",
            meio=meio or "DIGITAL",
            fase_arquivistica=calc_ttd["fase_arquivistica"],
            prazo_corrente_anos=calc_ttd["prazo_corrente_anos"],
            prazo_intermediaria_anos=calc_ttd["prazo_intermediaria_anos"],
            ano_destinacao_final=calc_ttd["ano_destinacao_final"],
            destinacao_prevista=calc_ttd["destinacao_prevista"],
            nivel_acesso=nivel_acesso or "OSTENSIVO",
            hipotese_legal=hipotese_legal or "",
            formato_mime=formato_mime,
            hash_sha256=hash_sha256,
            fixidade_verificada=1,
            ultima_verificacao_fixidade=data_hora_str,
            usuario_captura=responsavel_efetivo,
        )
        db.add(novo_doc)

        componente = ComponenteDigitalModel(
            id=str(uuid.uuid4()),
            documento_id=doc_id,
            ordem=1,
            nome_arquivo=nome,
            ext=ext,
            formato_mime=formato_mime,
            tamanho_bytes=tamanho_bytes,
            hash_sha256=hash_sha256,
            algoritmo_hash="SHA-256",
            caminho_relativo=caminho_relativo,
            criado_em=data_hora_str,
            ultima_verificacao=data_hora_str,
            status_fixidade="INTEGRO",
        )
        db.add(componente)

        registrar_evento(
            db=db,
            categoria_evento="PRESERVACAO",
            tipo_evento="CALCULO_HASH_SHA256",
            documento_id=doc_id,
            numero_protocolo=numero_protocolo,
            usuario_responsavel=responsavel_efetivo,
            papel_usuario=papel_efetivo,
            resultado="SUCESSO",
            hash_evidencia=hash_sha256,
            ip_origem=ip_cliente,
            detalhes=(
                f"Fixidade PREMIS calculada em stream (SHA-256: {hash_sha256[:16]}...) "
                f"e formato identificado ({formato_mime}, {tamanho_bytes} bytes) para '{nome}'."
            ),
        )

        registrar_evento(
            db=db,
            categoria_evento="CICLO_VIDA",
            tipo_evento="CAPTURA_ARQUIVISTICA",
            documento_id=doc_id,
            numero_protocolo=numero_protocolo,
            usuario_responsavel=responsavel_efetivo,
            papel_usuario=papel_efetivo,
            resultado="SUCESSO",
            hash_evidencia=hash_sha256,
            ip_origem=ip_cliente,
            detalhes=(
                f"Documento '{nome}' capturado no SIGAD sob protocolo {numero_protocolo} "
                f"[Dossiê: {codigo_dossie_final or 'Avulso'} | Destinação TTD: {calc_ttd['destinacao_prevista']} "
                f"({calc_ttd['ano_destinacao_final']}) | Classe: {codigo_classificacao or 'N/A'}]."
            ),
        )

        db.commit()

    return {
        "mensagem": "Captura arquivística concluída",
        "id": doc_id,
        "numeroProtocolo": numero_protocolo,
        "dossieId": dossie_id_final,
        "codigoDossie": codigo_dossie_final,
        "upload": data_upload,
        "hora": hora_upload,
        "sigla": sigla,
        "url": url_nova,
        "tamanho": tamanho_bytes,
        "hashSha256": hash_sha256,
        "formatoMime": formato_mime,
        "genero": genero_doc,
        "autor": autor or "Fundação Casa de José Américo (FCJA)",
        "statusDocumento": status_documento or "ORIGINAL",
        "meio": meio or "DIGITAL",
        "faseArquivistica": calc_ttd["fase_arquivistica"],
        "prazoCorrenteAnos": calc_ttd["prazo_corrente_anos"],
        "prazoIntermediariaAnos": calc_ttd["prazo_intermediaria_anos"],
        "anoDestinacaoFinal": calc_ttd["ano_destinacao_final"],
        "destinacaoPrevista": calc_ttd["destinacao_prevista"],
        "nivelAcesso": nivel_acesso or "OSTENSIVO",
        "hipoteseLegal": hipotese_legal or "",
        "fixidadeVerificada": True,
        "ultimaVerificacaoFixidade": data_hora_str,
    }


@router.delete("/api/documentos/{doc_id}")
def deletar_documento(
    doc_id: str,
    motivo_eliminacao: str = Query("CUMPRIMENTO_PRAZO_TTD"),
    justificativa: str = Query(""),
    usuario_responsavel: str = Query("sistema"),
    papel_usuario: str = Query(""),
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(
        authorization=authorization,
        usuario_fallback=usuario_responsavel,
        papel_fallback=papel_usuario,
    )
    ip_cliente = get_ip_cliente(request)

    with database.SessionLocal() as db:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Documento não encontrado")

        caminho_fisico = montar_caminho_fisico(doc)
        termo_info = executar_eliminacao_controlada(
            db=db,
            doc=doc,
            caminho_fisico=caminho_fisico,
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            motivo_eliminacao=motivo_eliminacao,
            justificativa=justificativa,
            ip_origem=ip_cliente,
        )
        db.commit()

    return {
        "sucesso": True,
        "mensagem": "Documento eliminado com emissão de Termo de Eliminação",
        "termo": termo_info,
    }


@router.post("/api/documentos/eliminar-lote")
def eliminar_documentos_lote(
    dados: EliminacaoLoteSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(
        authorization=authorization,
        usuario_fallback=dados.usuario_responsavel or "sistema",
        papel_fallback=dados.papel_usuario or "",
    )
    ip_cliente = get_ip_cliente(request)
    termos_gerados = []

    with database.SessionLocal() as db:
        for doc_id in dados.ids_documentos:
            doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
            if not doc:
                continue
            caminho_fisico = montar_caminho_fisico(doc)
            termo = executar_eliminacao_controlada(
                db=db,
                doc=doc,
                caminho_fisico=caminho_fisico,
                usuario_responsavel=agente["nome"],
                papel_usuario=agente["papel"],
                motivo_eliminacao=dados.motivo_eliminacao,
                justificativa=dados.justificativa,
                ip_origem=ip_cliente,
            )
            termos_gerados.append(termo)
        db.commit()

    return {
        "sucesso": True,
        "totalEliminados": len(termos_gerados),
        "termos": termos_gerados,
    }


@router.put("/api/documentos/{doc_id}")
def atualizar_documento(
    doc_id: str,
    dados: DocUpdateSchema,
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(
        authorization=authorization,
        usuario_fallback=dados.usuario_responsavel or "sistema",
        papel_fallback=dados.papel_usuario or "",
    )
    ip_cliente = get_ip_cliente(request)

    with database.SessionLocal() as db:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if not doc:
            return {"erro": "Documento não encontrado"}

        caminho_antigo = montar_caminho_fisico(doc)
        caminho_novo = os.path.join(
            database.PASTA_ARQUIVOS,
            limpar_nome_pasta(dados.nucleo),
            str(dados.ano),
            limpar_nome_pasta(dados.categoria),
            limpar_nome_pasta(dados.nome),
        )

        if caminho_antigo != caminho_novo and os.path.exists(caminho_antigo):
            os.makedirs(os.path.dirname(caminho_novo), exist_ok=True)
            os.rename(caminho_antigo, caminho_novo)

        base_atual = get_base_url(request)
        caminho_relativo = f"{limpar_nome_pasta(dados.nucleo)}/{dados.ano}/{limpar_nome_pasta(dados.categoria)}/{limpar_nome_pasta(dados.nome)}"
        url_nova = f"{base_atual}/arquivos/{urllib.parse.quote(caminho_relativo)}"

        nome_anterior = doc.nome
        doc.nome = dados.nome
        doc.categoria = dados.categoria
        doc.ano = dados.ano
        doc.nucleo = dados.nucleo
        doc.url = url_nova

        if dados.autor is not None:
            doc.autor = dados.autor
        if dados.status_documento is not None:
            doc.status_documento = dados.status_documento
        if dados.nivel_acesso is not None:
            doc.nivel_acesso = dados.nivel_acesso
        if dados.hipotese_legal is not None:
            doc.hipotese_legal = dados.hipotese_legal

        comp = (
            db.query(ComponenteDigitalModel)
            .filter(ComponenteDigitalModel.documento_id == doc_id)
            .first()
        )
        if comp:
            comp.nome_arquivo = dados.nome
            comp.caminho_relativo = caminho_relativo

        registrar_evento(
            db=db,
            categoria_evento="PROCEDIMENTAL",
            tipo_evento="ATUALIZACAO_METADADOS",
            documento_id=doc.id,
            numero_protocolo=doc.numero_protocolo or "",
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            resultado="SUCESSO",
            hash_evidencia=doc.hash_sha256 or "",
            ip_origem=ip_cliente,
            detalhes=(
                f"Metadados descritivos atualizados para o protocolo {doc.numero_protocolo or doc.id}: "
                f"nome ('{nome_anterior}' -> '{dados.nome}'), tipologia='{dados.categoria}', "
                f"ano={dados.ano}, status='{doc.status_documento}', acesso='{doc.nivel_acesso}'."
            ),
        )

        db.commit()

    return {"mensagem": "Documento atualizado com sucesso", "url": url_nova}


@router.post("/api/documentos/{doc_id}/verificar-fixidade")
def verificar_fixidade_documento(
    doc_id: str,
    usuario_responsavel: str = Query("sistema"),
    papel_usuario: str = Query(""),
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(
        authorization=authorization,
        usuario_fallback=usuario_responsavel,
        papel_fallback=papel_usuario,
    )
    ip_cliente = get_ip_cliente(request)

    with database.SessionLocal() as db:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Documento não encontrado")

        caminho_fisico = montar_caminho_fisico(doc)
        resultado = verificar_fixidade_arquivo(caminho_fisico, doc.hash_sha256 or "")

        if resultado["status_fixidade"] == "HASH_INICIALIZADO":
            doc.hash_sha256 = resultado["hash_calculado"]

        doc.fixidade_verificada = 1 if resultado["integro"] else 0
        doc.ultima_verificacao_fixidade = resultado["verificado_em"]

        comp = (
            db.query(ComponenteDigitalModel)
            .filter(ComponenteDigitalModel.documento_id == doc.id)
            .first()
        )
        if comp:
            comp.ultima_verificacao = resultado["verificado_em"]
            comp.status_fixidade = "INTEGRO" if resultado["integro"] else resultado["status_fixidade"]

        registrar_evento(
            db=db,
            categoria_evento="PRESERVACAO",
            tipo_evento="VERIFICACAO_FIXIDADE",
            documento_id=doc.id,
            numero_protocolo=doc.numero_protocolo or "",
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            resultado="SUCESSO" if resultado["integro"] else "FALHA",
            hash_evidencia=resultado["hash_calculado"] or doc.hash_sha256 or "",
            ip_origem=ip_cliente,
            detalhes=f"[{resultado['status_fixidade']}] {resultado['mensagem']}",
        )

        db.commit()

        return {
            "sucesso": True,
            "documentoId": doc.id,
            "numeroProtocolo": doc.numero_protocolo or "",
            "nome": doc.nome or "",
            "integro": resultado["integro"],
            "statusFixidade": resultado["status_fixidade"],
            "hashRegistrado": resultado["hash_registrado"],
            "hashCalculado": resultado["hash_calculado"],
            "verificadoEm": resultado["verificado_em"],
            "mensagem": resultado["mensagem"],
        }


@router.post("/api/documentos/verificar-fixidade-lote")
def verificar_fixidade_lote(
    usuario_responsavel: str = Query("sistema"),
    papel_usuario: str = Query(""),
    authorization: Optional[str] = Header(None),
    request: Request = None,
):
    agente = extrair_agente_requisicao(
        authorization=authorization,
        usuario_fallback=usuario_responsavel,
        papel_fallback=papel_usuario,
    )
    ip_cliente = get_ip_cliente(request)

    with database.SessionLocal() as db:
        documentos = db.query(DocumentoModel).all()
        integros = 0
        violados = 0
        ausentes = 0
        resultados_itens = []

        for doc in documentos:
            caminho_fisico = montar_caminho_fisico(doc)
            res = verificar_fixidade_arquivo(caminho_fisico, doc.hash_sha256 or "")

            if res["status_fixidade"] == "HASH_INICIALIZADO":
                doc.hash_sha256 = res["hash_calculado"]

            doc.fixidade_verificada = 1 if res["integro"] else 0
            doc.ultima_verificacao_fixidade = res["verificado_em"]

            if res["integro"]:
                integros += 1
            elif res["status_fixidade"] == "ARQUIVO_AUSENTE":
                ausentes += 1
            else:
                violados += 1

            resultados_itens.append({
                "documentoId": doc.id,
                "numeroProtocolo": doc.numero_protocolo or "",
                "nome": doc.nome or "",
                "integro": res["integro"],
                "statusFixidade": res["status_fixidade"],
                "hashSha256": res["hash_calculado"] or doc.hash_sha256 or "",
                "verificadoEm": res["verificado_em"],
            })

        registrar_evento(
            db=db,
            categoria_evento="PRESERVACAO",
            tipo_evento="AUDITORIA_FIXIDADE_LOTE",
            usuario_responsavel=agente["nome"],
            papel_usuario=agente["papel"],
            resultado="SUCESSO" if (violados == 0 and ausentes == 0) else "ALERTA",
            ip_origem=ip_cliente,
            detalhes=(
                f"Auditoria PREMIS de fixidade em lote concluída sobre {len(documentos)} documento(s): "
                f"{integros} íntegro(s), {violados} violado(s), {ausentes} ausente(s)."
            ),
        )
        db.commit()

        return {
            "sucesso": True,
            "totalVerificados": len(documentos),
            "integros": integros,
            "violados": violados,
            "ausentes": ausentes,
            "verificadoEm": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            "itens": resultados_itens,
        }


@router.get("/api/visualizar-planilha/{doc_id}")
def visualizar_planilha(doc_id: str):
    with database.SessionLocal() as db:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if not doc:
            return {"erro": "Documento não encontrado"}

        caminho_fisico = montar_caminho_fisico(doc)

    if not os.path.exists(caminho_fisico):
        return {"erro": "Arquivo físico não encontrado."}

    try:
        try:
            df = pd.read_excel(caminho_fisico)
        except ValueError as e:
            if "engine" in str(e).lower() or "format" in str(e).lower():
                dfs = pd.read_html(caminho_fisico)
                df = dfs[0]
            else:
                raise e

        df = df.fillna("")
        colunas = df.columns.astype(str).tolist()
        linhas = df.to_dict(orient="records")
        return {"colunas": colunas, "linhas": linhas}

    except Exception as e:
        return {"erro": f"O arquivo é um 'falso Excel' não suportado ou está corrompido. Detalhe: {str(e)}"}


@router.post("/api/documentos/{doc_id}/abrir-local")
def abrir_arquivo_local(doc_id: str):
    with database.SessionLocal() as db:
        doc = db.query(DocumentoModel).filter(DocumentoModel.id == doc_id).first()
        if not doc:
            return {"sucesso": False, "erro": "Documento não encontrado."}

        caminho_fisico = montar_caminho_fisico(doc)

    if not os.path.exists(caminho_fisico):
        return {"sucesso": False, "erro": "Arquivo físico não encontrado."}

    if platform.system() == "Windows":
        try:
            os.startfile(caminho_fisico)
            return {"sucesso": True}
        except Exception as e:
            return {"sucesso": False, "erro": str(e)}
    else:
        return {
            "sucesso": False,
            "erro": "Em servidor Linux remoto, o arquivo deve ser aberto diretamente pelo navegador ou baixado.",
        }


@router.get("/arquivos/{caminho_arquivo:path}")
def servir_arquivo_dinamico(caminho_arquivo: str):
    caminho_completo = os.path.join(database.PASTA_ARQUIVOS, caminho_arquivo)

    caminho_absoluto_base = os.path.abspath(database.PASTA_ARQUIVOS)
    caminho_absoluto_arquivo = os.path.abspath(caminho_completo)
    if not caminho_absoluto_arquivo.startswith(caminho_absoluto_base):
        raise HTTPException(status_code=403, detail="Acesso negado")

    if not os.path.exists(caminho_absoluto_arquivo):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no armazenamento atual")

    return FileResponse(caminho_absoluto_arquivo)
