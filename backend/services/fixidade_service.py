import hashlib
import mimetypes
import os
from datetime import datetime

CHUNK_SIZE = 65536  # 64 KB por bloco para leitura em stream com baixo uso de RAM

MIME_POR_EXTENSAO = {
    "pdf": "application/pdf",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
    "csv": "text/csv",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "doc": "application/msword",
    "tiff": "image/tiff",
    "tif": "image/tiff",
}

GENERO_POR_EXTENSAO = {
    "pdf": "Textual",
    "docx": "Textual",
    "doc": "Textual",
    "xlsx": "Textual / Tabular",
    "xls": "Textual / Tabular",
    "csv": "Textual / Tabular",
    "tiff": "Iconográfico",
    "tif": "Iconográfico",
}


def calcular_hash_sha256(caminho_arquivo: str) -> str:
    """
    Responsabilidade única: Calcular o digest criptográfico SHA-256 (earq.componente.fixidade)
    de um arquivo físico em stream (blocos de 64KB).
    """
    if not os.path.exists(caminho_arquivo):
        return ""

    sha256 = hashlib.sha256()
    with open(caminho_arquivo, "rb") as arquivo:
        while chunk := arquivo.read(CHUNK_SIZE):
            sha256.update(chunk)
    return sha256.hexdigest()


def identificar_formato_e_genero(caminho_arquivo: str, ext: str) -> tuple[str, str]:
    """
    Responsabilidade única: Identificar o formato MIME real (earq.componente.formato)
    inspecionando os magic bytes iniciais do arquivo e determinar o gênero documental.
    """
    ext_limpa = (ext or "").lower().lstrip(".")
    genero = GENERO_POR_EXTENSAO.get(ext_limpa, "Textual")
    mime_padrao = MIME_POR_EXTENSAO.get(ext_limpa)

    if os.path.exists(caminho_arquivo):
        try:
            with open(caminho_arquivo, "rb") as f:
                cabecalho = f.read(16)
            if cabecalho.startswith(b"%PDF-"):
                return "application/pdf", "Textual"
            if cabecalho.startswith((b"II*\x00", b"MM\x00*")):
                return "image/tiff", "Iconográfico"
            if cabecalho.startswith(b"PK\x03\x04"):
                if ext_limpa in ("xlsx", "xls"):
                    return MIME_POR_EXTENSAO["xlsx"], "Textual / Tabular"
                if ext_limpa in ("docx", "doc"):
                    return MIME_POR_EXTENSAO["docx"], "Textual"
        except OSError:
            pass

    if mime_padrao:
        return mime_padrao, genero

    mime_estimado, _ = mimetypes.guess_type(caminho_arquivo)
    return mime_estimado or "application/octet-stream", genero


def verificar_fixidade_arquivo(caminho_arquivo: str, hash_registrado: str) -> dict:
    """
    Responsabilidade única: Executar a Verificação de Fixidade PREMIS comparando o
    hash SHA-256 armazenado no banco com o arquivo físico atual no disco.
    """
    agora_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    if not os.path.exists(caminho_arquivo):
        return {
            "integro": False,
            "status_fixidade": "ARQUIVO_AUSENTE",
            "hash_registrado": hash_registrado or "",
            "hash_calculado": "",
            "verificado_em": agora_str,
            "mensagem": "Alerta PREMIS: O componente digital físico não foi encontrado no armazenamento.",
        }

    hash_atual = calcular_hash_sha256(caminho_arquivo)

    if not hash_registrado:
        return {
            "integro": True,
            "status_fixidade": "HASH_INICIALIZADO",
            "hash_registrado": hash_atual,
            "hash_calculado": hash_atual,
            "verificado_em": agora_str,
            "mensagem": "Hash SHA-256 calculado e vinculado ao componente digital.",
        }

    integro = hash_atual.lower() == hash_registrado.lower()
    return {
        "integro": integro,
        "status_fixidade": "INTEGRO" if integro else "VIOLADO",
        "hash_registrado": hash_registrado,
        "hash_calculado": hash_atual,
        "verificado_em": agora_str,
        "mensagem": (
            "Fixidade SHA-256 confirmada (componente digital autêntico e inalterado)."
            if integro
            else "ALERTA CRÍTICO PREMIS: Divergência de hash SHA-256 detectada (possível corrupção ou adulteração)."
        ),
    }
