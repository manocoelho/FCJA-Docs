import csv
import hashlib
import json
import os
import re
import shutil
import urllib.parse
import zipfile
from datetime import datetime
from typing import Any, Dict, List
from xml.sax.saxutils import escape

from services.fpr_archivematica_service import (
    analisar_conformidade_fpr,
    mapear_dc_type_dcmi,
)

# Colunas oficiais de metadata/rights.csv (Aba 3 da especificação Archivematica 1.18.0 FCJA)
COLUNAS_RIGHTS_CSV = [
    "file",
    "basis",
    "status",
    "determination_date",
    "jurisdiction",
    "start_date",
    "end_date",
    "terms",
    "citation",
    "note",
    "grant_act",
    "grant_restriction",
    "grant_start_date",
    "grant_end_date",
    "grant_note",
    "doc_id_type",
    "doc_id_value",
    "doc_id_role",
]

# Colunas oficiais de metadata/metadata.csv (Aba 2 da especificação Archivematica 1.18.0 FCJA)
COLUNAS_METADATA_CSV = [
    "filename",
    "dc.title",
    "dc.creator",
    "dc.subject",
    "dc.description",
    "dc.publisher",
    "dc.contributor",
    "dc.date",
    "dc.type",
    "dc.format",
    "dc.identifier",
    "dc.source",
    "dc.language",
    "dc.relation",
    "dc.coverage",
    "dc.rights",
    "dcterms.isPartOf",
    "dcterms.accessRights",
    "classificacao",
    "prazo_guarda",
    "destinacao_prevista",
    "earq.protocolo",
    "earq.tipo_atividade",
    "earq.codigo_classificacao",
    "earq.dossie",
    "earq.status_documento",
    "earq.fase_arquivistica",
    "earq.sha256",
    "fpr.puid_pronom",
    "fpr.acao_preservacao",
]


def _calcular_sha256_arquivo(caminho: str) -> str:
    """Calcula o resumo criptográfico SHA-256 de um arquivo em disco."""
    h = hashlib.sha256()
    with open(caminho, "rb") as f:
        while True:
            bloco = f.read(65536)
            if not bloco:
                break
            h.update(bloco)
    return h.hexdigest()


def _limpar_nome_pasta(texto: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", str(texto or ""))


def _sanitizar_nome_objeto(doc_id: str, nome_original: str, ext: str) -> str:
    """
    Gera um nome de arquivo seguro, sem caracteres especiais proibidos,
    para a pasta objects/ do pacote Standard Transfer do Archivematica.
    """
    base = "".join(
        c if (c.isalnum() or c in ("-", "_", ".")) else "_"
        for c in (nome_original or f"doc_{doc_id}")
    )
    sufixo = f".{ext.lower().lstrip('.')}" if ext else ".pdf"
    if not base.lower().endswith(sufixo):
        base = f"{base}{sufixo}"
    return f"{doc_id}_{base}"


def _normalizar_data_iso8601(data_str: str, ano_fallback: Any) -> str:
    """
    Converte datas em formato DD/MM/YYYY, YYYY-MM-DD ou ano puro para o padrão
    ISO 8601 (YYYY-MM-DD) exigido pelo Archivematica 1.18.0 em dc.date e rights.csv.
    """
    texto = str(data_str or "").strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}", texto):
        return texto[:10]
    m_br = re.match(r"^(\d{2})/(\d{2})/(\d{4})", texto)
    if m_br:
        dia, mes, ano = m_br.groups()
        return f"{ano}-{mes}-{dia}"
    ano_int = int(ano_fallback) if str(ano_fallback or "").isdigit() else datetime.now().year
    return f"{ano_int:04d}-01-01"


def _normalizar_timestamp_iso8601(ts_str: str) -> str:
    """Garante formato ISO 8601 YYYY-MM-DDTHH:MM:SS para eventos PREMIS XML."""
    texto = str(ts_str or "").strip()
    if not texto:
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    if "T" in texto and re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", texto):
        return texto[:19]
    if re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}", texto):
        return texto[:19].replace(" ", "T")
    m_br = re.match(r"^(\d{2})/(\d{2})/(\d{4})\s+(\d{2}:\d{2}:\d{2})", texto)
    if m_br:
        dia, mes, ano, hora = m_br.groups()
        return f"{ano}-{mes}-{dia}T{hora}"
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _resolver_caminho_fisico_documento(pasta_arquivos: str, doc: Any) -> str:
    """
    Localiza o arquivo binário real do documento em PASTA_ARQUIVOS considerando:
      1. A estrutura hierárquica oficial: PASTA_ARQUIVOS/{nucleo}/{ano}/{categoria}/{nome}
      2. A URL pública gravada no documento (/arquivos/...) com URL-unquote
      3. O nome base direto na raiz de PASTA_ARQUIVOS (fallback legado)
    """
    candidatos: List[str] = []

    # 1. Estrutura hierárquica oficial (igual a montar_caminho_fisico em routers/documentos.py)
    if getattr(doc, "nucleo", None) and getattr(doc, "ano", None) and getattr(doc, "categoria", None) and getattr(doc, "nome", None):
        candidatos.append(
            os.path.join(
                pasta_arquivos,
                _limpar_nome_pasta(doc.nucleo),
                str(doc.ano),
                _limpar_nome_pasta(doc.categoria),
                _limpar_nome_pasta(doc.nome),
            )
        )

    # 2. Caminho relativo extraído da URL (/arquivos/{nucleo}/{ano}/{categoria}/{nome})
    url_doc = str(getattr(doc, "url", "") or "")
    if "/arquivos/" in url_doc:
        cauda_url = url_doc.split("/arquivos/", 1)[1]
        partes = [urllib.parse.unquote(p) for p in cauda_url.split("/") if p]
        if partes:
            candidatos.append(os.path.join(pasta_arquivos, *partes))

    # 3. Fallback direto pelo basename na raiz de PASTA_ARQUIVOS
    if url_doc:
        nome_base = urllib.parse.unquote(os.path.basename(url_doc))
        candidatos.append(os.path.join(pasta_arquivos, nome_base))
    if getattr(doc, "nome", None):
        candidatos.append(os.path.join(pasta_arquivos, _limpar_nome_pasta(doc.nome)))

    for caminho in candidatos:
        if caminho and os.path.isfile(caminho):
            return caminho

    return ""


def _gerar_premis_v3_xml(
    codigo_sip: str,
    itens_empacotados: List[Dict[str, Any]],
    eventos_premis: List[Dict[str, Any]],
) -> str:
    """
    Constrói o arquivo metadata/premis.xml no padrão PREMIS v3 XML exigido pela
    Aba 3 (3. Direitos e PREMIS) do Archivematica 1.18.0:
      - premis:originalName idêntico ao caminho relativo no pacote (objects/<nome_objeto>)
      - premis:fixity com SHA-256 e tamanho em bytes
      - premis:format com formatName e PRONOM PUID (formatRegistryKey)
      - premis:event com datas em ISO 8601 (YYYY-MM-DDTHH:MM:SS)
      - premis:agent identificando o SIGAD FCJA
    """
    agora_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    linhas = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<premis:premis xmlns:premis="http://www.loc.gov/premis/v3" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="3.0">',
    ]

    # 1. Objetos Digitais (premis:object)
    for item in itens_empacotados:
        caminho_rel_obj = f"objects/{item['nome_objeto']}"
        puid_principal = str(item.get("fpr_puid", "fmt/18")).split(",")[0].strip()
        linhas.extend(
            [
                '  <premis:object xsi:type="premis:file">',
                "    <premis:objectIdentifier>",
                "      <premis:objectIdentifierType>SIGAD-FCJA-NUP</premis:objectIdentifierType>",
                f"      <premis:objectIdentifierValue>{escape(str(item['numero_protocolo'] or item['id']))}</premis:objectIdentifierValue>",
                "    </premis:objectIdentifier>",
                "    <premis:objectCharacteristics>",
                "      <premis:compositionLevel>0</premis:compositionLevel>",
                "      <premis:fixity>",
                "        <premis:messageDigestAlgorithm>SHA-256</premis:messageDigestAlgorithm>",
                f"        <premis:messageDigest>{escape(str(item['hash_sha256_empacotado']))}</premis:messageDigest>",
                "        <premis:messageDigestOriginator>SIGAD FCJA (e-ARQ Brasil v2)</premis:messageDigestOriginator>",
                "      </premis:fixity>",
                f"      <premis:size>{int(item['tamanho'])}</premis:size>",
                "      <premis:format>",
                "        <premis:formatDesignation>",
                f"          <premis:formatName>{escape(str(item['formato_mime']))}</premis:formatName>",
                "        </premis:formatDesignation>",
                "        <premis:formatRegistry>",
                "          <premis:formatRegistryName>PRONOM</premis:formatRegistryName>",
                f"          <premis:formatRegistryKey>{escape(puid_principal)}</premis:formatRegistryKey>",
                "        </premis:formatRegistry>",
                "      </premis:format>",
                "    </premis:objectCharacteristics>",
                f"    <premis:originalName>{escape(caminho_rel_obj)}</premis:originalName>",
                "  </premis:object>",
            ]
        )

    # 2. Eventos de Pré-Depósito da Cadeia de Custódia (premis:event)
    for idx, ev in enumerate(eventos_premis, start=1):
        ts_iso = _normalizar_timestamp_iso8601(str(ev.get("timestampEvento", "")))
        linhas.extend(
            [
                "  <premis:event>",
                "    <premis:eventIdentifier>",
                "      <premis:eventIdentifierType>SIGAD-EVENT-ID</premis:eventIdentifierType>",
                f"      <premis:eventIdentifierValue>{escape(f'{codigo_sip}-EV-{idx:04d}')}</premis:eventIdentifierValue>",
                "    </premis:eventIdentifier>",
                f"    <premis:eventType>{escape(str(ev.get('tipoEvento', 'ingestion')))}</premis:eventType>",
                f"    <premis:eventDateTime>{escape(ts_iso)}</premis:eventDateTime>",
                "    <premis:eventDetailInformation>",
                f"      <premis:eventDetail>{escape(str(ev.get('descricao', '')))}</premis:eventDetail>",
                "    </premis:eventDetailInformation>",
                "    <premis:eventOutcomeInformation>",
                "      <premis:eventOutcome>SUCCESS</premis:eventOutcome>",
                "    </premis:eventOutcomeInformation>",
                "    <premis:linkingAgentIdentifier>",
                "      <premis:linkingAgentIdentifierType>SIGAD-USER</premis:linkingAgentIdentifierType>",
                f"      <premis:linkingAgentIdentifierValue>{escape(str(ev.get('usuarioResponsavel', 'sistema')))}</premis:linkingAgentIdentifierValue>",
                "    </premis:linkingAgentIdentifier>",
                "  </premis:event>",
            ]
        )

    # Evento sintético de empacotamento e verificação de fixidade pré-depósito
    linhas.extend(
        [
            "  <premis:event>",
            "    <premis:eventIdentifier>",
            "      <premis:eventIdentifierType>SIGAD-SIP-PACKAGING</premis:eventIdentifierType>",
            f"      <premis:eventIdentifierValue>{escape(codigo_sip)}</premis:eventIdentifierValue>",
            "    </premis:eventIdentifier>",
            "    <premis:eventType>message digest calculation</premis:eventType>",
            f"    <premis:eventDateTime>{agora_iso}</premis:eventDateTime>",
            "    <premis:eventDetailInformation>",
            f"      <premis:eventDetail>Empacotamento Standard Transfer ({len(itens_empacotados)} objetos) e verificação de fixidade SHA-256 pré-depósito no SIGAD FCJA.</premis:eventDetail>",
            "    </premis:eventDetailInformation>",
            "    <premis:eventOutcomeInformation>",
            "      <premis:eventOutcome>SUCCESS</premis:eventOutcome>",
            "    </premis:eventOutcomeInformation>",
            "  </premis:event>",
            "  <premis:agent>",
            "    <premis:agentIdentifier>",
            "      <premis:agentIdentifierType>SIGAD</premis:agentIdentifierType>",
            "      <premis:agentIdentifierValue>SIGAD-FCJA-EARQ-V2</premis:agentIdentifierValue>",
            "    </premis:agentIdentifier>",
            "    <premis:agentName>Fundação Casa de José Américo (FCJA) — SIGAD e-ARQ Brasil v2</premis:agentName>",
            "    <premis:agentType>software</premis:agentType>",
            "  </premis:agent>",
            "</premis:premis>",
        ]
    )
    return "\n".join(linhas) + "\n"


def _gerar_mets_earq_xml(
    codigo_sip: str,
    titulo_sip: str,
    dossie_codigo: str,
    nucleo: str,
    itens_empacotados: List[Dict[str, Any]],
) -> str:
    """
    Constrói o manifesto XML no padrão METS (Metadata Encoding and Transmission Standard)
    combinado com e-ARQ Brasil v2 (Seções dmdSec, amdSec, fileSec e structMap).
    """
    agora_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    linhas = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<mets:mets xmlns:mets="http://www.loc.gov/METS/" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" '
        'xmlns:dcterms="http://purl.org/dc/terms/" '
        'xmlns:premis="http://www.loc.gov/premis/v3" '
        'xmlns:earq="http://www.conarq.gov.br/earq-brasil/v2" '
        f'OBJID="{escape(codigo_sip)}" '
        f'LABEL="{escape(titulo_sip)}" '
        'PROFILE="http://www.archivematica.org/METS/profiles/e-ARQ-Brasil-v2">',
        f'  <mets:metsHdr CREATEDATE="{agora_iso}" RECORDSTATUS="COMPLETE">',
        '    <mets:agent ROLE="CREATOR" TYPE="ORGANIZATION">',
        "      <mets:name>Fundação Casa de José Américo (FCJA) — SIGAD e-ARQ Brasil v2</mets:name>",
        "    </mets:agent>",
        "  </mets:metsHdr>",
    ]

    # 1. Seções Descritivas (dmdSec — Dublin Core + e-ARQ Brasil v2)
    for idx, item in enumerate(itens_empacotados, start=1):
        linhas.extend(
            [
                f'  <mets:dmdSec ID="dmdSec_{idx}">',
                '    <mets:mdWrap MDTYPE="DC">',
                "      <mets:xmlData>",
                f"        <dc:title>{escape(str(item.get('nome', '')))}</dc:title>",
                f"        <dc:creator>{escape(str(item.get('autor', 'FCJA')))}</dc:creator>",
                f"        <dc:date>{escape(str(item.get('data_iso', '')))}</dc:date>",
                f"        <dc:type>{escape(str(item.get('dc_type_dcmi', 'Text')))}</dc:type>",
                f"        <dc:format>{escape(str(item.get('formato_mime', 'application/pdf')))}</dc:format>",
                f"        <dc:identifier>{escape(str(item.get('numero_protocolo', '')))}</dc:identifier>",
                f"        <dc:language>pt-BR</dc:language>",
                f"        <dc:rights>{escape(str(item.get('dc_rights_texto', '')))}</dc:rights>",
                f"        <dcterms:isPartOf>{escape(str(item.get('dcterms_is_part_of', '')))}</dcterms:isPartOf>",
                f"        <earq:codigoClassificacao>{escape(str(item.get('codigo_classificacao', '')))}</earq:codigoClassificacao>",
                f"        <earq:prazoGuarda>{escape(str(item.get('prazo_guarda_texto', '')))}</earq:prazoGuarda>",
                f"        <earq:destinacaoPrevista>{escape(str(item.get('destinacao_prevista', '')))}</earq:destinacaoPrevista>",
                f"        <earq:codigoDossie>{escape(str(item.get('codigo_dossie', dossie_codigo)))}</earq:codigoDossie>",
                "      </mets:xmlData>",
                "    </mets:mdWrap>",
                "  </mets:dmdSec>",
            ]
        )

    # 2. Seções Administrativas e de Preservação (amdSec — PREMIS Fixity)
    linhas.append('  <mets:amdSec ID="amdSec_1">')
    for idx, item in enumerate(itens_empacotados, start=1):
        linhas.extend(
            [
                f'    <mets:techMD ID="techMD_{idx}">',
                '      <mets:mdWrap MDTYPE="PREMIS:OBJECT">',
                "        <mets:xmlData>",
                "          <premis:object>",
                "            <premis:objectCharacteristics>",
                "              <premis:fixity>",
                "                <premis:messageDigestAlgorithm>SHA-256</premis:messageDigestAlgorithm>",
                f"                <premis:messageDigest>{escape(str(item.get('hash_sha256_empacotado', '')))}</premis:messageDigest>",
                "              </premis:fixity>",
                f"              <premis:size>{int(item.get('tamanho', 0))}</premis:size>",
                "            </premis:objectCharacteristics>",
                "          </premis:object>",
                "        </mets:xmlData>",
                "      </mets:mdWrap>",
                "    </mets:techMD>",
            ]
        )
    linhas.append("  </mets:amdSec>")

    # 3. Seção de Componentes Digitais (fileSec)
    linhas.append("  <mets:fileSec>")
    linhas.append('    <mets:fileGrp USE="original">')
    for idx, item in enumerate(itens_empacotados, start=1):
        linhas.extend(
            [
                f'      <mets:file ID="file_{idx}" GROUPID="Group_{idx}" ADMID="techMD_{idx}" '
                f'MIMETYPE="{escape(str(item.get("formato_mime", "application/pdf")))}" '
                f'SIZE="{int(item.get("tamanho", 0))}" '
                f'CHECKSUM="{escape(str(item.get("hash_sha256_empacotado", "")))}" CHECKSUMTYPE="SHA-256">',
                f'        <mets:FLocat LOCTYPE="OTHER" OTHERLOCTYPE="SYSTEM" '
                f'xlink:href="objects/{escape(str(item.get("nome_objeto", "")))}" '
                'xmlns:xlink="http://www.w3.org/1999/xlink"/>',
                "      </mets:file>",
            ]
        )
    linhas.append("    </mets:fileGrp>")
    linhas.append("  </mets:fileSec>")

    # 4. Mapa Estrutural Orgânico (structMap)
    linhas.append('  <mets:structMap TYPE="physical" LABEL="Estrutura Arquivística SIGAD FCJA">')
    linhas.append(
        f'    <mets:div TYPE="Directory" LABEL="{escape(codigo_sip)} — {escape(nucleo or "FCJA")}">'
    )
    linhas.append('      <mets:div TYPE="Directory" LABEL="objects">')
    for idx, item in enumerate(itens_empacotados, start=1):
        linhas.extend(
            [
                f'        <mets:div TYPE="Item" LABEL="{escape(str(item.get("nome", "")))}" DMDID="dmdSec_{idx}">',
                f'          <mets:fptr FILEID="file_{idx}"/>',
                "        </mets:div>",
            ]
        )
    linhas.append("      </mets:div>")
    linhas.append("    </mets:div>")
    linhas.append("  </mets:structMap>")
    linhas.append("</mets:mets>")
    return "\n".join(linhas) + "\n"


def construir_pacote_sip_bagit(
    pasta_dados: str,
    pasta_arquivos: str,
    codigo_sip: str,
    titulo_sip: str,
    dossie_codigo: str,
    nucleo: str,
    documentos: List[Any],
    eventos_premis: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Constrói fisicamente o pacote SIP no formato **Standard Transfer** oficial do
    Archivematica 1.18.0 (Aba 1 da especificação FCJA `http://192.168.1.132`), contendo:
      <codigo_sip>/
      ├── objects/
      │   └── <arquivos_digitais_originais>
      ├── metadata/
      │   ├── metadata.csv               (15 elementos Dublin Core + dcterms + campos FCJA)
      │   ├── rights.csv                 (18 colunas PREMIS Rights — LAI / Acesso)
      │   ├── premis.xml                 (PREMIS v3 XML de pré-depósito)
      │   ├── premis_events.json         (Auditoria legível e regras FPR PRONOM)
      │   ├── mets_earq_manifest.xml     (Manifesto METS + e-ARQ Brasil v2)
      │   └── submissionDocumentation/
      │       └── termo_recolhimento_sigad_fcja.txt
      ├── bagit.txt
      ├── bag-info.txt
      ├── manifest-sha256.txt
      └── tagmanifest-sha256.txt
    E gera o arquivo compactado `<codigo_sip>.zip` para download e auditoria.
    """
    pasta_base_sips = os.path.join(pasta_dados, "sips_archivematica")
    os.makedirs(pasta_base_sips, exist_ok=True)

    pasta_sip = os.path.join(pasta_base_sips, codigo_sip)
    if os.path.exists(pasta_sip):
        shutil.rmtree(pasta_sip, ignore_errors=True)

    # Estrutura Standard Transfer exigida pelo Archivematica 1.18.0 (objects/ e metadata/ na raiz)
    pasta_objects = os.path.join(pasta_sip, "objects")
    pasta_metadata = os.path.join(pasta_sip, "metadata")
    pasta_subdoc = os.path.join(pasta_metadata, "submissionDocumentation")
    os.makedirs(pasta_objects, exist_ok=True)
    os.makedirs(pasta_metadata, exist_ok=True)
    os.makedirs(pasta_subdoc, exist_ok=True)

    itens_empacotados: List[Dict[str, Any]] = []
    tamanho_total_payload = 0
    qtd_arquivos_payload = 0

    # 1. Copia cada componente digital para objects/
    for doc in documentos:
        ext_doc = str(getattr(doc, "ext", "") or "pdf").lower().lstrip(".")
        nome_objeto = _sanitizar_nome_objeto(str(doc.id), str(doc.nome or ""), ext_doc)
        destino_objeto = os.path.join(pasta_objects, nome_objeto)

        caminho_origem = _resolver_caminho_fisico_documento(pasta_arquivos, doc)
        copiado_binario_real = False

        if caminho_origem and os.path.isfile(caminho_origem):
            shutil.copy2(caminho_origem, destino_objeto)
            copiado_binario_real = True
        else:
            # Caso o documento seja um registro sem binário físico local, gera folha de rosto técnica
            conteudo_espelho = (
                f"ESPELHO DIPLOMATICO DE COMPONENTE DIGITAL — SIGAD FCJA (e-ARQ Brasil v2)\n"
                f"========================================================================\n"
                f"ID Documento: {doc.id}\n"
                f"Numero Unico de Protocolo (NUP): {doc.numero_protocolo or 'N/A'}\n"
                f"Titulo: {doc.nome}\n"
                f"Autor / Produtor: {doc.autor or 'Fundação Casa de José Américo (FCJA)'}\n"
                f"Nucleo: {doc.nucleo}\n"
                f"Sigla NOBRADE: {doc.sigla}\n"
                f"Atividade: {doc.tipo_atividade}\n"
                f"Classe PCD: {doc.codigo_classificacao} - {doc.descricao_codigo}\n"
                f"Dossie / Processo: {doc.codigo_dossie or dossie_codigo or 'Avulso'}\n"
                f"Hash SHA-256 Original: {doc.hash_sha256}\n"
                f"Pacote SIP OAIS: {codigo_sip}\n"
            ).encode("utf-8")
            with open(destino_objeto, "wb") as f_obj:
                f_obj.write(conteudo_espelho)

        sha256_objeto = _calcular_sha256_arquivo(destino_objeto)
        tamanho_objeto = os.path.getsize(destino_objeto)
        tamanho_total_payload += tamanho_objeto
        qtd_arquivos_payload += 1

        # Análise FPR (Format Policy Registry) do Archivematica 1.18.0
        regra_fpr = analisar_conformidade_fpr(ext_doc, str(doc.nome or ""))
        formato_mime = getattr(doc, "formato_mime", "") or "application/pdf"
        dc_type_dcmi = mapear_dc_type_dcmi(ext_doc, formato_mime)
        data_iso = _normalizar_data_iso8601(getattr(doc, "data", ""), getattr(doc, "ano", None))

        prazo_corr = getattr(doc, "prazo_corrente_anos", 2) or 2
        prazo_inter = getattr(doc, "prazo_intermediaria_anos", 3) or 3
        prazo_guarda_texto = f"Fase corrente: {prazo_corr} anos; intermediária: {prazo_inter} anos"

        nivel_acesso = str(getattr(doc, "nivel_acesso", "") or "OSTENSIVO").upper()
        hipotese_legal = str(getattr(doc, "hipotese_legal", "") or "").strip()
        if nivel_acesso == "OSTENSIVO":
            dc_rights_texto = "Acesso público nos termos da Lei Federal nº 12.527/2011 (LAI)"
            access_rights_texto = "Acesso aberto"
        else:
            dc_rights_texto = (
                f"Acesso {nivel_acesso} — "
                f"{hipotese_legal or 'Restrição legal nos termos da Lei nº 12.527/2011 (LAI) / LGPD'}"
            )
            access_rights_texto = f"Restrito ({nivel_acesso})"

        nucleo_doc = getattr(doc, "nucleo", "") or nucleo or "FCJA"
        cod_classe = getattr(doc, "codigo_classificacao", "") or "000"
        dcterms_is_part_of = f"Fundo FCJA / {nucleo_doc} / Classe {cod_classe}"

        itens_empacotados.append(
            {
                "id": doc.id,
                "numero_protocolo": getattr(doc, "numero_protocolo", "") or "",
                "nome": getattr(doc, "nome", "") or "",
                "nome_objeto": nome_objeto,
                "ext": ext_doc,
                "autor": getattr(doc, "autor", "") or "Fundação Casa de José Américo (FCJA)",
                "redator": getattr(doc, "redator", "") or "",
                "originador": getattr(doc, "originador", "") or "",
                "ano": getattr(doc, "ano", None) or datetime.now().year,
                "data_iso": data_iso,
                "categoria": getattr(doc, "categoria", "") or "Documento Arquivístico",
                "dc_type_dcmi": dc_type_dcmi,
                "formato_mime": formato_mime,
                "meio": getattr(doc, "meio", "") or "DIGITAL",
                "nivel_acesso": nivel_acesso,
                "hipotese_legal": hipotese_legal,
                "dc_rights_texto": dc_rights_texto,
                "access_rights_texto": access_rights_texto,
                "dcterms_is_part_of": dcterms_is_part_of,
                "tipo_atividade": getattr(doc, "tipo_atividade", "") or "Atividade-Fim",
                "codigo_classificacao": cod_classe,
                "descricao_codigo": getattr(doc, "descricao_codigo", "") or "",
                "prazo_guarda_texto": prazo_guarda_texto,
                "codigo_dossie": getattr(doc, "codigo_dossie", "") or dossie_codigo or "",
                "nucleo": nucleo_doc,
                "sigla": getattr(doc, "sigla", "") or "FCJA",
                "status_documento": getattr(doc, "status_documento", "") or "ORIGINAL",
                "fase_arquivistica": "RECOLHIDO_RDC_ARQ",
                "destinacao_prevista": getattr(doc, "destinacao_prevista", "") or "GUARDA_PERMANENTE",
                "tamanho": tamanho_objeto,
                "hash_sha256": getattr(doc, "hash_sha256", "") or sha256_objeto,
                "hash_sha256_empacotado": sha256_objeto,
                "binario_real_copiado": copiado_binario_real,
                "fpr_puid": regra_fpr["puidPronom"],
                "fpr_descricao": regra_fpr["descricaoFormato"],
                "fpr_acao_preservacao": regra_fpr["acaoPreservacao"],
                "fpr_acao_acesso": regra_fpr["acaoAcesso"],
                "fpr_ferramenta_validacao": regra_fpr["ferramentaValidacao"],
            }
        )

    # 2. Gera metadata/metadata.csv (Aba 2 da especificação FCJA — Dublin Core completo + dcterms + campos FCJA)
    caminho_csv = os.path.join(pasta_metadata, "metadata.csv")
    with open(caminho_csv, "w", encoding="utf-8", newline="") as f_csv:
        writer = csv.DictWriter(f_csv, fieldnames=COLUNAS_METADATA_CSV)
        writer.writeheader()
        for item in itens_empacotados:
            assunto_dc = "; ".join(
                p
                for p in (
                    item["tipo_atividade"],
                    item["categoria"],
                    item["descricao_codigo"],
                )
                if p
            )
            descricao_dc = (
                f"Protocolo NUP: {item['numero_protocolo'] or item['id']} | "
                f"Classe PCD: {item['codigo_classificacao']} - {item['descricao_codigo']} | "
                f"Núcleo Produtor: {item['nucleo']} ({item['sigla']})"
            )
            contribuidor_dc = item["redator"] or item["originador"] or "SIGAD FCJA"
            relacao_dc = item["codigo_dossie"] or codigo_sip

            writer.writerow(
                {
                    "filename": f"objects/{item['nome_objeto']}",
                    "dc.title": item["nome"],
                    "dc.creator": item["autor"],
                    "dc.subject": assunto_dc,
                    "dc.description": descricao_dc,
                    "dc.publisher": "Fundação Casa de José Américo (FCJA)",
                    "dc.contributor": contribuidor_dc,
                    "dc.date": item["data_iso"],
                    "dc.type": item["dc_type_dcmi"],
                    "dc.format": item["formato_mime"],
                    "dc.identifier": item["numero_protocolo"] or f"FCJA-DOC-{item['id']}",
                    "dc.source": f"SIGAD FCJA — Acervo Digital ({item['meio']})",
                    "dc.language": "pt-BR",
                    "dc.relation": relacao_dc,
                    "dc.coverage": "João Pessoa, PB, Brasil",
                    "dc.rights": item["dc_rights_texto"],
                    "dcterms.isPartOf": item["dcterms_is_part_of"],
                    "dcterms.accessRights": item["access_rights_texto"],
                    "classificacao": item["codigo_classificacao"],
                    "prazo_guarda": item["prazo_guarda_texto"],
                    "destinacao_prevista": item["destinacao_prevista"],
                    "earq.protocolo": item["numero_protocolo"],
                    "earq.tipo_atividade": item["tipo_atividade"],
                    "earq.codigo_classificacao": item["codigo_classificacao"],
                    "earq.dossie": item["codigo_dossie"],
                    "earq.status_documento": item["status_documento"],
                    "earq.fase_arquivistica": item["fase_arquivistica"],
                    "earq.sha256": item["hash_sha256_empacotado"],
                    "fpr.puid_pronom": item["fpr_puid"],
                    "fpr.acao_preservacao": item["fpr_acao_preservacao"],
                }
            )
    tamanho_total_payload += os.path.getsize(caminho_csv)
    qtd_arquivos_payload += 1

    # 3. Gera metadata/rights.csv (Aba 3 da especificação FCJA — 18 colunas PREMIS Rights na ordem exata)
    caminho_rights = os.path.join(pasta_metadata, "rights.csv")
    with open(caminho_rights, "w", encoding="utf-8", newline="") as f_rights:
        writer_r = csv.DictWriter(f_rights, fieldnames=COLUNAS_RIGHTS_CSV)
        writer_r.writeheader()
        for item in itens_empacotados:
            eh_ostensivo = item["nivel_acesso"] == "OSTENSIVO"
            ano_base = int(item["ano"]) if str(item["ano"]).isdigit() else datetime.now().year
            data_fim_restricao = "" if eh_ostensivo else f"{ano_base + 5:04d}-12-31"
            citacao_legal = (
                item["hipotese_legal"]
                or "Lei Federal nº 12.527/2011 (Lei de Acesso à Informação - LAI) e Lei nº 8.159/1991"
            )
            writer_r.writerow(
                {
                    "file": f"objects/{item['nome_objeto']}",
                    "basis": "statute",
                    "status": "",
                    "determination_date": item["data_iso"],
                    "jurisdiction": "br",
                    "start_date": item["data_iso"],
                    "end_date": data_fim_restricao,
                    "terms": (
                        "Documento arquivístico ostensivo de acesso público"
                        if eh_ostensivo
                        else f"Restrição legal temporária de acesso ({item['nivel_acesso']})"
                    ),
                    "citation": citacao_legal,
                    "note": f"Classificação atribuída pelo SIGAD FCJA ({item['nivel_acesso']})",
                    "grant_act": "disseminate",
                    "grant_restriction": "Allow" if eh_ostensivo else "Disallow",
                    "grant_start_date": item["data_iso"],
                    "grant_end_date": data_fim_restricao,
                    "grant_note": (
                        "Autorizada a difusão pública no AtoM (Guarda Permanente FCJA)"
                        if eh_ostensivo
                        else "Difusão pública bloqueada durante o período de restrição legal"
                    ),
                    "doc_id_type": "protocolo_sigad_nup",
                    "doc_id_value": item["numero_protocolo"] or str(item["id"]),
                    "doc_id_role": "identificador_unico",
                }
            )
    tamanho_total_payload += os.path.getsize(caminho_rights)
    qtd_arquivos_payload += 1

    # 4. Gera metadata/premis.xml (Aba 3 da especificação FCJA — PREMIS v3 XML)
    caminho_premis_xml = os.path.join(pasta_metadata, "premis.xml")
    conteudo_premis_xml = _gerar_premis_v3_xml(
        codigo_sip=codigo_sip,
        itens_empacotados=itens_empacotados,
        eventos_premis=eventos_premis,
    )
    with open(caminho_premis_xml, "w", encoding="utf-8") as f_pxml:
        f_pxml.write(conteudo_premis_xml)
    tamanho_total_payload += os.path.getsize(caminho_premis_xml)
    qtd_arquivos_payload += 1

    # 5. Gera metadata/premis_events.json (Auditoria estruturada + Diagnóstico FPR 1.639 formatos)
    caminho_premis_json = os.path.join(pasta_metadata, "premis_events.json")
    payload_premis = {
        "pacoteSip": codigo_sip,
        "titulo": titulo_sip,
        "tipoPacoteArchivematica": "standard",
        "entidadeProdutora": "Fundação Casa de José Américo (FCJA)",
        "normaReferencia": "Archivematica 1.18.0 + e-ARQ Brasil v2 (CONARQ, 2022) + PREMIS v3 + Resolução CONARQ nº 51/2023",
        "geradoEm": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "documentos": itens_empacotados,
        "eventosCadeiaCustodia": eventos_premis,
    }
    with open(caminho_premis_json, "w", encoding="utf-8") as f_premis:
        json.dump(payload_premis, f_premis, ensure_ascii=False, indent=2)
    tamanho_total_payload += os.path.getsize(caminho_premis_json)
    qtd_arquivos_payload += 1

    # 6. Gera metadata/mets_earq_manifest.xml (METS completo)
    caminho_mets = os.path.join(pasta_metadata, "mets_earq_manifest.xml")
    conteudo_mets = _gerar_mets_earq_xml(
        codigo_sip=codigo_sip,
        titulo_sip=titulo_sip,
        dossie_codigo=dossie_codigo,
        nucleo=nucleo,
        itens_empacotados=itens_empacotados,
    )
    with open(caminho_mets, "w", encoding="utf-8") as f_mets:
        f_mets.write(conteudo_mets)
    tamanho_total_payload += os.path.getsize(caminho_mets)
    qtd_arquivos_payload += 1

    # 7. Gera metadata/submissionDocumentation/termo_recolhimento_sigad_fcja.txt (Aba 1 da especificação FCJA)
    caminho_termo = os.path.join(pasta_subdoc, "termo_recolhimento_sigad_fcja.txt")
    linhas_termo = [
        "FUNDAÇÃO CASA DE JOSÉ AMÉRICO (FCJA) — SIGAD e-ARQ BRASIL v2",
        "TERMO DE TRANSFERÊNCIA / RECOLHIMENTO DIGITAL (SUBMISSION DOCUMENTATION)",
        "========================================================================",
        f"Código do Pacote SIP : {codigo_sip}",
        f"Título do Recolhimento: {titulo_sip}",
        f"Núcleo Produtor      : {nucleo}",
        f"Dossiê / Processo    : {dossie_codigo or 'Seleção Avulsa'}",
        f"Data/Hora de Geração : {datetime.now().strftime('%Y-%m-%dT%H:%M:%S')}",
        f"Total de Objetos     : {len(itens_empacotados)}",
        "",
        "RELAÇÃO DE OBJETOS DIGITAIS E HASHES DE FIXIDADE (SHA-256):",
        "------------------------------------------------------------------------",
    ]
    for idx, it in enumerate(itens_empacotados, start=1):
        linhas_termo.append(
            f"{idx:02d}. objects/{it['nome_objeto']} | NUP: {it['numero_protocolo']} | "
            f"Classe: {it['codigo_classificacao']} | PUID: {it['fpr_puid']} | "
            f"SHA-256: {it['hash_sha256_empacotado']}"
        )
    with open(caminho_termo, "w", encoding="utf-8") as f_termo:
        f_termo.write("\n".join(linhas_termo) + "\n")
    tamanho_total_payload += os.path.getsize(caminho_termo)
    qtd_arquivos_payload += 1

    # 8. Gera arquivos de controle BagIt (RFC 8493) e manifestos SHA-256
    caminho_bagit = os.path.join(pasta_sip, "bagit.txt")
    with open(caminho_bagit, "w", encoding="utf-8") as f_bagit:
        f_bagit.write("BagIt-Version: 0.97\nTag-File-Character-Encoding: UTF-8\n")

    caminho_baginfo = os.path.join(pasta_sip, "bag-info.txt")
    with open(caminho_baginfo, "w", encoding="utf-8") as f_info:
        f_info.write(
            "Source-Organization: Fundação Casa de José Américo (FCJA)\n"
            "Organization-Address: Av. Cabo Branco, 3336 - Cabo Branco, João Pessoa - PB\n"
            "Contact-Name: Repositório Arquivístico Digital Confiável (RDC-Arq FCJA)\n"
            f"External-Description: {titulo_sip}\n"
            f"External-Identifier: {codigo_sip}\n"
            f"Bagging-Date: {datetime.now().strftime('%Y-%m-%d')}\n"
            f"Payload-Oxum: {tamanho_total_payload}.{qtd_arquivos_payload}\n"
        )

    caminho_manifest = os.path.join(pasta_sip, "manifest-sha256.txt")
    linhas_manifest: List[str] = []
    for subpasta in ("objects", "metadata"):
        for root, _, files in os.walk(os.path.join(pasta_sip, subpasta)):
            for nome_arq in sorted(files):
                abs_path = os.path.join(root, nome_arq)
                rel_path = os.path.relpath(abs_path, pasta_sip).replace("\\", "/")
                digest = _calcular_sha256_arquivo(abs_path)
                linhas_manifest.append(f"{digest}  {rel_path}")

    with open(caminho_manifest, "w", encoding="utf-8") as f_man:
        f_man.write("\n".join(linhas_manifest) + "\n")

    caminho_tagmanifest = os.path.join(pasta_sip, "tagmanifest-sha256.txt")
    linhas_tag: List[str] = []
    for tag_file in ("bagit.txt", "bag-info.txt", "manifest-sha256.txt"):
        abs_tag = os.path.join(pasta_sip, tag_file)
        digest = _calcular_sha256_arquivo(abs_tag)
        linhas_tag.append(f"{digest}  {tag_file}")

    with open(caminho_tagmanifest, "w", encoding="utf-8") as f_tag:
        f_tag.write("\n".join(linhas_tag) + "\n")

    # 9. Compacta em <codigo_sip>.zip para download e auditoria
    caminho_zip = os.path.join(pasta_base_sips, f"{codigo_sip}.zip")
    with zipfile.ZipFile(caminho_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(pasta_sip):
            for nome_arq in sorted(files):
                abs_path = os.path.join(root, nome_arq)
                arcname = os.path.join(
                    codigo_sip, os.path.relpath(abs_path, pasta_sip)
                ).replace("\\", "/")
                zf.write(abs_path, arcname)

    hash_zip_sha256 = _calcular_sha256_arquivo(caminho_zip)
    tamanho_zip = os.path.getsize(caminho_zip)

    return {
        "pasta_sip": pasta_sip,
        "caminho_zip": caminho_zip,
        "caminho_metadata_csv": caminho_csv,
        "caminho_rights_csv": caminho_rights,
        "caminho_premis_xml": caminho_premis_xml,
        "hash_manifesto_sha256": hash_zip_sha256,
        "tamanho_total_bytes": tamanho_zip,
        "quantidade_documentos": len(itens_empacotados),
        "itens_empacotados": itens_empacotados,
    }
