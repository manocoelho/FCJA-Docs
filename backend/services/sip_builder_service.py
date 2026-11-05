import csv
import hashlib
import json
import os
import shutil
import zipfile
from datetime import datetime
from typing import Any, Dict, List
from xml.sax.saxutils import escape


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


def _sanitizar_nome_objeto(doc_id: str, nome_original: str, ext: str) -> str:
    """Gera um nome de arquivo seguro e único para data/objects/ no pacote BagIt."""
    base = "".join(
        c if (c.isalnum() or c in ("-", "_", ".")) else "_"
        for c in (nome_original or f"doc_{doc_id}")
    )
    sufixo = f".{ext.lower().lstrip('.')}" if ext else ".pdf"
    if not base.lower().endswith(sufixo):
        base = f"{base}{sufixo}"
    return f"{doc_id}_{base}"


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
                f"        <dc:date>{escape(str(item.get('ano', '')))}</dc:date>",
                f"        <dc:type>{escape(str(item.get('categoria', '')))}</dc:type>",
                f"        <dc:format>{escape(str(item.get('formato_mime', 'application/pdf')))}</dc:format>",
                f"        <dc:identifier>{escape(str(item.get('numero_protocolo', '')))}</dc:identifier>",
                f"        <dc:rights>{escape(str(item.get('nivel_acesso', 'OSTENSIVO')))}</dc:rights>",
                f"        <earq:codigoClassificacao>{escape(str(item.get('codigo_classificacao', '')))}</earq:codigoClassificacao>",
                f"        <earq:tipoAtividade>{escape(str(item.get('tipo_atividade', '')))}</earq:tipoAtividade>",
                f"        <earq:codigoDossie>{escape(str(item.get('codigo_dossie', dossie_codigo)))}</earq:codigoDossie>",
                f"        <earq:siglaNobrade>{escape(str(item.get('sigla', '')))}</earq:siglaNobrade>",
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
                f"                <premis:messageDigest>{escape(str(item.get('hash_sha256', '')))}</premis:messageDigest>",
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
                f'CHECKSUM="{escape(str(item.get("hash_sha256", "")))}" CHECKSUMTYPE="SHA-256">',
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
    Constrói fisicamente um pacote SIP (Submission Information Package) no padrão
    BagIt (RFC 8493) + Archivematica Standard Transfer com:
      - data/objects/<arquivos_digitais>
      - data/metadata/metadata.csv (Dublin Core + e-ARQ Brasil v2 para Archivematica/AtoM)
      - data/metadata/premis_events.json (Trilha de Auditoria e-ARQ v2 / PREMIS)
      - data/metadata/mets_earq_manifest.xml (METS completo)
      - bagit.txt, bag-info.txt, manifest-sha256.txt, tagmanifest-sha256.txt
      - Arquivo compactado <codigo_sip>.zip pronto para depósito ou download.
    """
    pasta_base_sips = os.path.join(pasta_dados, "sips_archivematica")
    os.makedirs(pasta_base_sips, exist_ok=True)

    pasta_sip = os.path.join(pasta_base_sips, codigo_sip)
    if os.path.exists(pasta_sip):
        shutil.rmtree(pasta_sip, ignore_errors=True)

    pasta_objects = os.path.join(pasta_sip, "data", "objects")
    pasta_metadata = os.path.join(pasta_sip, "data", "metadata")
    os.makedirs(pasta_objects, exist_ok=True)
    os.makedirs(pasta_metadata, exist_ok=True)

    itens_empacotados: List[Dict[str, Any]] = []
    tamanho_total_payload = 0
    qtd_arquivos_payload = 0

    # 1. Copia (ou materializa folha de rosto técnica) de cada componente digital para data/objects/
    for doc in documentos:
        nome_objeto = _sanitizar_nome_objeto(str(doc.id), str(doc.nome or ""), str(doc.ext or "pdf"))
        destino_objeto = os.path.join(pasta_objects, nome_objeto)

        nome_fisico_origem = os.path.basename(doc.url) if doc.url else ""
        caminho_origem = os.path.join(pasta_arquivos, nome_fisico_origem) if nome_fisico_origem else ""

        if caminho_origem and os.path.isfile(caminho_origem):
            shutil.copy2(caminho_origem, destino_objeto)
        else:
            # Caso o documento seja de demonstração sem binário local, gera o espelho diplomático
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

        itens_empacotados.append(
            {
                "id": doc.id,
                "numero_protocolo": doc.numero_protocolo or "",
                "nome": doc.nome or "",
                "nome_objeto": nome_objeto,
                "autor": doc.autor or "Fundação Casa de José Américo (FCJA)",
                "ano": doc.ano or datetime.now().year,
                "categoria": doc.categoria or "Documento Arquivístico",
                "formato_mime": doc.formato_mime or "application/pdf",
                "nivel_acesso": doc.nivel_acesso or "OSTENSIVO",
                "hipotese_legal": doc.hipotese_legal or "",
                "tipo_atividade": doc.tipo_atividade or "Atividade-Fim",
                "codigo_classificacao": doc.codigo_classificacao or "",
                "descricao_codigo": doc.descricao_codigo or "",
                "codigo_dossie": doc.codigo_dossie or dossie_codigo or "",
                "nucleo": doc.nucleo or nucleo or "",
                "sigla": doc.sigla or "",
                "status_documento": doc.status_documento or "ORIGINAL",
                "fase_arquivistica": "RECOLHIDO_RDC_ARQ",
                "destinacao_prevista": doc.destinacao_prevista or "GUARDA_PERMANENTE",
                "tamanho": tamanho_objeto,
                "hash_sha256": doc.hash_sha256 or sha256_objeto,
                "hash_sha256_empacotado": sha256_objeto,
            }
        )

    # 2. Gera data/metadata/metadata.csv (Padrão nativo Archivematica Dublin Core + e-ARQ v2)
    caminho_csv = os.path.join(pasta_metadata, "metadata.csv")
    colunas_csv = [
        "filename",
        "dc.title",
        "dc.creator",
        "dc.date",
        "dc.type",
        "dc.format",
        "dc.identifier",
        "dc.rights",
        "dc.coverage",
        "dc.description",
        "earq.protocolo",
        "earq.tipo_atividade",
        "earq.codigo_classificacao",
        "earq.dossie",
        "earq.status_documento",
        "earq.fase_arquivistica",
        "earq.destinacao_prevista",
        "earq.sha256",
    ]
    with open(caminho_csv, "w", encoding="utf-8", newline="") as f_csv:
        writer = csv.DictWriter(f_csv, fieldnames=colunas_csv)
        writer.writeheader()
        for item in itens_empacotados:
            writer.writerow(
                {
                    "filename": f"objects/{item['nome_objeto']}",
                    "dc.title": item["nome"],
                    "dc.creator": item["autor"],
                    "dc.date": str(item["ano"]),
                    "dc.type": item["categoria"],
                    "dc.format": item["formato_mime"],
                    "dc.identifier": item["numero_protocolo"] or item["id"],
                    "dc.rights": item["nivel_acesso"],
                    "dc.coverage": item["nucleo"],
                    "dc.description": f"{item['codigo_classificacao']} - {item['descricao_codigo']} ({item['sigla']})",
                    "earq.protocolo": item["numero_protocolo"],
                    "earq.tipo_atividade": item["tipo_atividade"],
                    "earq.codigo_classificacao": item["codigo_classificacao"],
                    "earq.dossie": item["codigo_dossie"],
                    "earq.status_documento": item["status_documento"],
                    "earq.fase_arquivistica": item["fase_arquivistica"],
                    "earq.destinacao_prevista": item["destinacao_prevista"],
                    "earq.sha256": item["hash_sha256"],
                }
            )
    tamanho_total_payload += os.path.getsize(caminho_csv)
    qtd_arquivos_payload += 1

    # 3. Gera data/metadata/premis_events.json (Cadeia de Custódia e-ARQ v2 / PREMIS)
    caminho_premis = os.path.join(pasta_metadata, "premis_events.json")
    payload_premis = {
        "pacoteSip": codigo_sip,
        "titulo": titulo_sip,
        "entidadeProdutora": "Fundação Casa de José Américo (FCJA)",
        "normaReferencia": "e-ARQ Brasil v2 (CONARQ, 2022) + PREMIS v3 + Resolução CONARQ nº 51/2023",
        "geradoEm": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "documentos": itens_empacotados,
        "eventosCadeiaCustodia": eventos_premis,
    }
    with open(caminho_premis, "w", encoding="utf-8") as f_premis:
        json.dump(payload_premis, f_premis, ensure_ascii=False, indent=2)
    tamanho_total_payload += os.path.getsize(caminho_premis)
    qtd_arquivos_payload += 1

    # 4. Gera data/metadata/mets_earq_manifest.xml (METS completo)
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

    # 5. Gera arquivos de controle BagIt (RFC 8493)
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

    # 6. Gera manifest-sha256.txt (todos os arquivos dentro de data/)
    caminho_manifest = os.path.join(pasta_sip, "manifest-sha256.txt")
    linhas_manifest: List[str] = []
    for root, _, files in os.walk(os.path.join(pasta_sip, "data")):
        for nome_arq in sorted(files):
            abs_path = os.path.join(root, nome_arq)
            rel_path = os.path.relpath(abs_path, pasta_sip).replace("\\", "/")
            digest = _calcular_sha256_arquivo(abs_path)
            linhas_manifest.append(f"{digest}  {rel_path}")

    with open(caminho_manifest, "w", encoding="utf-8") as f_man:
        f_man.write("\n".join(linhas_manifest) + "\n")

    # 7. Gera tagmanifest-sha256.txt
    caminho_tagmanifest = os.path.join(pasta_sip, "tagmanifest-sha256.txt")
    linhas_tag: List[str] = []
    for tag_file in ("bagit.txt", "bag-info.txt", "manifest-sha256.txt"):
        abs_tag = os.path.join(pasta_sip, tag_file)
        digest = _calcular_sha256_arquivo(abs_tag)
        linhas_tag.append(f"{digest}  {tag_file}")

    with open(caminho_tagmanifest, "w", encoding="utf-8") as f_tag:
        f_tag.write("\n".join(linhas_tag) + "\n")

    # 8. Compacta em <codigo_sip>.zip para download ou envio
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
        "hash_manifesto_sha256": hash_zip_sha256,
        "tamanho_total_bytes": tamanho_zip,
        "quantidade_documentos": len(itens_empacotados),
        "itens_empacotados": itens_empacotados,
    }
