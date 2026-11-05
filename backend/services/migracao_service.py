import os
import re
import uuid
from datetime import datetime
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from models.documento import DocumentoModel
from models.componente_digital import ComponenteDigitalModel
from services.fixidade_service import calcular_hash_sha256, identificar_formato_e_genero
from services.protocolo_service import gerar_numero_protocolo
from services.auditoria_service import registrar_evento


COLUNAS_NOVAS_DOCUMENTOS = [
    ("numero_protocolo", "VARCHAR(80) DEFAULT ''"),
    ("autor", "VARCHAR(255) DEFAULT 'Fundação Casa de José Américo (FCJA)'"),
    ("redator", "VARCHAR(255) DEFAULT ''"),
    ("originador", "VARCHAR(255) DEFAULT ''"),
    ("destinatario", "VARCHAR(255) DEFAULT ''"),
    ("genero", "VARCHAR(100) DEFAULT 'Textual'"),
    ("status_documento", "VARCHAR(50) DEFAULT 'ORIGINAL'"),
    ("meio", "VARCHAR(50) DEFAULT 'DIGITAL'"),
    ("fase_arquivistica", "VARCHAR(50) DEFAULT 'CORRENTE'"),
    ("nivel_acesso", "VARCHAR(50) DEFAULT 'OSTENSIVO'"),
    ("hipotese_legal", "VARCHAR(255) DEFAULT ''"),
    ("formato_mime", "VARCHAR(120) DEFAULT ''"),
    ("hash_sha256", "VARCHAR(64) DEFAULT ''"),
    ("fixidade_verificada", "INTEGER DEFAULT 1"),
    ("ultima_verificacao_fixidade", "VARCHAR(30) DEFAULT ''"),
    ("usuario_captura", "VARCHAR(100) DEFAULT 'sistema'"),
]


def _limpar_nome_pasta(texto: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", texto or "")


def migrar_esquema_banco(engine: Engine) -> None:
    """
    Responsabilidade única: Garantir migração transparente e não-destrutiva da tabela
    'documentos' tanto em MySQL quanto em SQLite, adicionando as novas colunas do e-ARQ v2
    caso ainda não existam.
    """
    inspetor = inspect(engine)
    if not inspetor.has_table("documentos"):
        return

    colunas_existentes = {col["name"] for col in inspetor.get_columns("documentos")}

    with engine.begin() as conn:
        for nome_coluna, definicao_sql in COLUNAS_NOVAS_DOCUMENTOS:
            if nome_coluna not in colunas_existentes:
                try:
                    conn.execute(text(f"ALTER TABLE documentos ADD COLUMN {nome_coluna} {definicao_sql}"))
                    print(f"[MIGRACAO e-ARQ v2] Coluna adicionada em documentos: {nome_coluna}")
                except Exception as exc:
                    print(f"[AVISO MIGRACAO] Nao foi possivel adicionar coluna {nome_coluna}: {exc}")


def sincronizar_legado_earq(db: Session, pasta_arquivos: str) -> None:
    """
    Responsabilidade única: Preencher retroativamente número de protocolo, hash SHA-256,
    formato MIME e ComponenteDigitalModel para documentos que foram cadastrados antes da Fase 1.
    """
    documentos = db.query(DocumentoModel).all()
    alterados = False
    agora_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    for doc in documentos:
        mudou_doc = False

        if not doc.numero_protocolo:
            doc.numero_protocolo = gerar_numero_protocolo(
                db=db,
                sigla=doc.sigla or "",
                nucleo=doc.nucleo or "",
                ano=doc.ano or 2026,
            )
            mudou_doc = True

        if not doc.autor:
            doc.autor = "Fundação Casa de José Américo (FCJA)"
            mudou_doc = True

        if not doc.status_documento:
            doc.status_documento = "ORIGINAL"
            mudou_doc = True

        if not doc.meio:
            doc.meio = "DIGITAL"
            mudou_doc = True

        if not doc.fase_arquivistica:
            doc.fase_arquivistica = "CORRENTE"
            mudou_doc = True

        if not doc.nivel_acesso:
            doc.nivel_acesso = "OSTENSIVO"
            mudou_doc = True

        caminho_relativo = os.path.join(
            _limpar_nome_pasta(doc.nucleo),
            str(doc.ano),
            _limpar_nome_pasta(doc.categoria),
            _limpar_nome_pasta(doc.nome),
        )
        caminho_fisico = os.path.join(pasta_arquivos, caminho_relativo)

        if not doc.formato_mime or not doc.genero:
            mime, genero = identificar_formato_e_genero(caminho_fisico, doc.ext or "pdf")
            doc.formato_mime = mime
            doc.genero = genero
            mudou_doc = True

        if not doc.hash_sha256 and os.path.exists(caminho_fisico):
            doc.hash_sha256 = calcular_hash_sha256(caminho_fisico)
            doc.fixidade_verificada = 1
            doc.ultima_verificacao_fixidade = agora_str
            mudou_doc = True

        comp_existente = (
            db.query(ComponenteDigitalModel)
            .filter(ComponenteDigitalModel.documento_id == doc.id)
            .first()
        )
        if not comp_existente and doc.hash_sha256:
            novo_comp = ComponenteDigitalModel(
                id=str(uuid.uuid4()),
                documento_id=doc.id,
                ordem=1,
                nome_arquivo=doc.nome or "",
                ext=doc.ext or "",
                formato_mime=doc.formato_mime or "application/octet-stream",
                tamanho_bytes=doc.tamanho or 0,
                hash_sha256=doc.hash_sha256,
                algoritmo_hash="SHA-256",
                caminho_relativo=caminho_relativo.replace("\\", "/"),
                criado_em=agora_str,
                ultima_verificacao=agora_str,
                status_fixidade="INTEGRO",
            )
            db.add(novo_comp)
            mudou_doc = True

        if mudou_doc:
            alterados = True
            registrar_evento(
                db=db,
                categoria_evento="PRESERVACAO",
                tipo_evento="SANEAMENTO_METADADOS_EARQ",
                documento_id=doc.id,
                numero_protocolo=doc.numero_protocolo,
                usuario_responsavel="sistema (migração e-ARQ v2)",
                papel_usuario="sistema",
                resultado="SUCESSO",
                hash_evidencia=doc.hash_sha256 or "",
                detalhes=(
                    f"Documento '{doc.nome}' sincronizado com o modelo e-ARQ Brasil v2. "
                    f"Protocolo atribuído: {doc.numero_protocolo}. "
                    f"Fixidade SHA-256: {doc.hash_sha256 or 'arquivo físico não localizado'}."
                ),
            )

    if alterados:
        db.commit()
