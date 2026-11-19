import json
import os
import re
import urllib.parse
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import desc
from sqlalchemy.orm import Session

from models.evento import EventoArquivisticoModel
from models.documento import DocumentoModel
from models.componente_digital import ComponenteDigitalModel
from services.fixidade_service import calcular_hash_sha256
from services.protocolo_service import gerar_numero_protocolo


def registrar_evento(
    db: Session,
    categoria_evento: str,
    tipo_evento: str,
    detalhes: str,
    documento_id: str = "",
    numero_protocolo: str = "",
    usuario_responsavel: str = "sistema",
    papel_usuario: str = "",
    resultado: str = "SUCESSO",
    hash_evidencia: str = "",
    ip_origem: str = "",
) -> EventoArquivisticoModel:
    """
    Responsabilidade única: Gravar um evento imutável (append-only) na trilha
    de auditoria do SIGAD conforme as 4 categorias do e-ARQ Brasil v2:
    - CICLO_VIDA (EarqEventoCv)
    - PRESERVACAO (EarqEventoPreservacao / PREMIS)
    - PROCEDIMENTAL (EarqEventoProc)
    - CLASSE (EarqEventoClasse)
    """
    agora = datetime.now()
    evento = EventoArquivisticoModel(
        id=str(uuid.uuid4()),
        categoria_evento=categoria_evento,
        tipo_evento=tipo_evento,
        documento_id=documento_id or "",
        numero_protocolo=numero_protocolo or "",
        usuario_responsavel=usuario_responsavel or "sistema",
        papel_usuario=papel_usuario or "",
        data_evento=agora.strftime("%d/%m/%Y"),
        hora_evento=agora.strftime("%H:%M:%S"),
        timestamp_iso=agora.isoformat(),
        resultado=resultado,
        detalhes=detalhes,
        hash_evidencia=hash_evidencia or "",
        ip_origem=ip_origem or "",
    )
    db.add(evento)
    return evento


def listar_eventos(
    db: Session,
    categoria_evento: Optional[str] = None,
    tipo_evento: Optional[str] = None,
    documento_id: Optional[str] = None,
    usuario_responsavel: Optional[str] = None,
    busca: Optional[str] = None,
    limite: int = 150,
) -> list[dict]:
    """
    Responsabilidade única: Consultar eventos arquivísticos com filtros para auditoria (e-ARQ 7.4.12).
    """
    query = db.query(EventoArquivisticoModel)

    if categoria_evento and categoria_evento != "TODOS":
        query = query.filter(EventoArquivisticoModel.categoria_evento == categoria_evento)
    if tipo_evento and tipo_evento != "TODOS":
        query = query.filter(EventoArquivisticoModel.tipo_evento == tipo_evento)
    if documento_id:
        query = query.filter(EventoArquivisticoModel.documento_id == documento_id)
    if usuario_responsavel and usuario_responsavel != "TODOS":
        query = query.filter(EventoArquivisticoModel.usuario_responsavel == usuario_responsavel)

    eventos = query.order_by(desc(EventoArquivisticoModel.timestamp_iso)).limit(max(1, min(limite, 1000))).all()

    termo = (busca or "").strip().lower()
    resultado = []
    for ev in eventos:
        item = {
            "id": ev.id,
            "categoriaEvento": ev.categoria_evento,
            "tipoEvento": ev.tipo_evento,
            "documentoId": ev.documento_id,
            "numeroProtocolo": ev.numero_protocolo,
            "usuarioResponsavel": ev.usuario_responsavel,
            "papelUsuario": ev.papel_usuario,
            "dataEvento": ev.data_evento,
            "horaEvento": ev.hora_evento,
            "timestampIso": ev.timestamp_iso,
            "resultado": ev.resultado,
            "detalhes": ev.detalhes,
            "hashEvidencia": ev.hash_evidencia,
            "ipOrigem": ev.ip_origem,
        }
        if termo:
            texto_busca = " ".join(
                [
                    item["categoriaEvento"],
                    item["tipoEvento"],
                    item["numeroProtocolo"],
                    item["usuarioResponsavel"],
                    item["detalhes"],
                    item["hashEvidencia"],
                    item["documentoId"],
                ]
            ).lower()
            if termo not in texto_busca:
                continue
        resultado.append(item)

    return resultado


def obter_resumo_auditoria(db: Session) -> dict:
    """
    Responsabilidade única: Consolidar indicadores de conformidade e-ARQ Brasil v2 e PREMIS.
    """
    todos_eventos = db.query(EventoArquivisticoModel).all()
    todos_docs = db.query(DocumentoModel).all()

    total_docs = len(todos_docs)
    docs_com_hash = sum(1 for d in todos_docs if d.hash_sha256)
    docs_integros = sum(1 for d in todos_docs if d.hash_sha256 and d.fixidade_verificada == 1)
    docs_violados = sum(1 for d in todos_docs if d.fixidade_verificada == 0)

    contagem_categorias = {
        "CICLO_VIDA": 0,
        "PRESERVACAO": 0,
        "PROCEDIMENTAL": 0,
        "CLASSE": 0,
    }
    for ev in todos_eventos:
        cat = ev.categoria_evento or "PROCEDIMENTAL"
        contagem_categorias[cat] = contagem_categorias.get(cat, 0) + 1

    return {
        "totalEventos": len(todos_eventos),
        "eventosPorCategoria": contagem_categorias,
        "totalDocumentos": total_docs,
        "documentosComHash": docs_com_hash,
        "documentosIntegros": docs_integros,
        "documentosViolados": docs_violados,
        "taxaIntegridadePercentual": round((docs_integros / total_docs) * 100, 1) if total_docs > 0 else 100.0,
    }


def _limpar_pasta_auditoria(texto: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", texto or "")


def arquivar_trilha_auditoria_como_documento(
    db: Session,
    pasta_arquivos: str,
    base_url: str,
    usuario_responsavel: str,
    papel_usuario: str,
    ip_origem: str = "",
) -> dict:
    """
    Requisito Obrigatório e-ARQ Brasil v2 (7.4.15 [O]):
    Empacota e arquiva um snapshot oficial da Trilha de Auditoria Imutável (com todos os eventos
    cronológicos, indicadores PREMIS e digest SHA-256) como um Documento Arquivístico Oficial
    de Guarda Permanente dentro do próprio SIGAD FCJA.
    """
    agora = datetime.now()
    ano_atual = agora.year
    carimbo_arquivo = agora.strftime("%Y%m%d_%H%M%S")
    data_str = agora.strftime("%d/%m/%Y")
    hora_str = agora.strftime("%H:%M:%S")
    data_hora_str = f"{data_str} {hora_str}"

    eventos = listar_eventos(db=db, limite=1000)
    resumo = obter_resumo_auditoria(db=db)

    nucleo = "Núcleo de Preservação e Memória Digital (RDC-Arq FCJA)"
    sigla = "BR_PB_FCJA_GEDA_GOP_PPMD_NRDCARQ"
    categoria = "Relatório de Auditoria"
    nome_arquivo = f"Trilha_Auditoria_Imutavel_SIGAD_FCJA_{carimbo_arquivo}.json"

    nucleo_limpo = _limpar_pasta_auditoria(nucleo)
    categoria_limpa = _limpar_pasta_auditoria(categoria)
    nome_limpo = _limpar_pasta_auditoria(nome_arquivo)

    subpasta = os.path.join(pasta_arquivos, nucleo_limpo, str(ano_atual), categoria_limpa)
    os.makedirs(subpasta, exist_ok=True)
    caminho_fisico = os.path.join(subpasta, nome_limpo)

    payload_trilha = {
        "cabecalhoNormativo": {
            "instituicao": "Fundação Casa de José Américo (FCJA)",
            "sistema": "SIGAD FCJA — Conformidade e-ARQ Brasil v2 (CONARQ) & PREMIS v3",
            "requisitoAtendido": "Requisito Obrigatório 7.4.15 [O] — Arquivamento Periódico da Trilha de Auditoria",
            "geradoEm": agora.isoformat(),
            "geradoPor": usuario_responsavel,
            "papelResponsavel": papel_usuario,
        },
        "resumoConformidade": resumo,
        "totalEventosExportados": len(eventos),
        "eventos": eventos,
    }

    with open(caminho_fisico, "w", encoding="utf-8") as f_out:
        json.dump(payload_trilha, f_out, ensure_ascii=False, indent=2)

    tamanho_bytes = os.path.getsize(caminho_fisico)
    hash_sha256 = calcular_hash_sha256(caminho_fisico)
    numero_protocolo = gerar_numero_protocolo(db=db, sigla=sigla, nucleo=nucleo, ano=ano_atual)
    doc_id = str(uuid.uuid4())

    caminho_relativo = f"{nucleo_limpo}/{ano_atual}/{categoria_limpa}/{nome_limpo}"
    url_nova = f"{base_url.rstrip('/')}/arquivos/{urllib.parse.quote(caminho_relativo)}"

    novo_doc = DocumentoModel(
        id=doc_id,
        numero_protocolo=numero_protocolo,
        dossie_id="",
        codigo_dossie="",
        tipo_atividade="Atividade-Fim",
        codigo_classificacao="FIM.200.02.001",
        descricao_codigo="Especificação Técnica, Políticas de Preservação e Pacotes OAIS do RDC-Arq",
        nome=nome_arquivo,
        descricao=(
            f"Trilha de Auditoria Imutável do SIGAD FCJA arquivada oficialmente conforme Requisito 7.4.15 [O] "
            f"do e-ARQ Brasil v2 ({len(eventos)} eventos auditados | Taxa de integridade: {resumo['taxaIntegridadePercentual']}%)."
        ),
        ext="json",
        categoria=categoria,
        ano=ano_atual,
        nucleo=nucleo,
        sigla=sigla,
        upload=data_str,
        hora=hora_str,
        url=url_nova,
        tamanho=tamanho_bytes,
        autor="SIGAD FCJA — Subsistema de Auditoria e Preservação PREMIS",
        redator=usuario_responsavel,
        originador="Fundação Casa de José Américo (FCJA)",
        destinatario="Repositório Arquivístico Digital Confiável (RDC-Arq FCJA)",
        genero="Textual",
        status_documento="ORIGINAL",
        meio="DIGITAL",
        fase_arquivistica="CORRENTE",
        prazo_corrente_anos=2,
        prazo_intermediaria_anos=3,
        ano_destinacao_final=ano_atual + 5,
        destinacao_prevista="GUARDA_PERMANENTE",
        nivel_acesso="OSTENSIVO",
        hipotese_legal="",
        previsao_desclassificacao="",
        formato_mime="application/json",
        hash_sha256=hash_sha256,
        fixidade_verificada=1,
        ultima_verificacao_fixidade=data_hora_str,
        usuario_captura=usuario_responsavel,
    )
    db.add(novo_doc)

    componente = ComponenteDigitalModel(
        id=str(uuid.uuid4()),
        documento_id=doc_id,
        ordem=1,
        nome_arquivo=nome_arquivo,
        ext="json",
        formato_mime="application/json",
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
        tipo_evento="ARQUIVAMENTO_TRILHA_AUDITORIA_7_4_15",
        documento_id=doc_id,
        numero_protocolo=numero_protocolo,
        usuario_responsavel=usuario_responsavel,
        papel_usuario=papel_usuario,
        resultado="SUCESSO",
        hash_evidencia=hash_sha256,
        ip_origem=ip_origem,
        detalhes=(
            f"[Requisito 7.4.15 [O] — e-ARQ Brasil v2] Trilha de Auditoria ({len(eventos)} eventos) "
            f"empacotada e arquivada como documento arquivístico oficial '{nome_arquivo}' "
            f"sob protocolo {numero_protocolo} (Classe FIM.200.02.001 | SHA-256: {hash_sha256[:16]}...)."
        ),
    )
    db.commit()

    return {
        "sucesso": True,
        "documentoId": doc_id,
        "numeroProtocolo": numero_protocolo,
        "nome": nome_arquivo,
        "hashSha256": hash_sha256,
        "tamanhoBytes": tamanho_bytes,
        "totalEventosArquivados": len(eventos),
        "url": url_nova,
        "codigoClassificacao": "FIM.200.02.001",
        "mensagem": (
            f"Trilha de Auditoria arquivada como documento oficial sob protocolo {numero_protocolo} "
            f"({len(eventos)} eventos, SHA-256 {hash_sha256[:12]}...)."
        ),
    }
