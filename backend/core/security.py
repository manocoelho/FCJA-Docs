import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Optional

# Configurações criptográficas (NIST / OWASP)
PBKDF2_ALGORITMO = "sha256"
PBKDF2_ITERACOES = 600000
PREFIXO_HASH = "pbkdf2_sha256"

# Segredo HMAC-SHA256 para assinatura de tokens JWT (RFC 7519)
JWT_SECRET = os.getenv(
    "FCJA_JWT_SECRET",
    "fcja_sigad_earq_v2_chave_secreta_institucional_2026_protegida",
)
JWT_EXPIRACAO_SEGUNDOS = int(os.getenv("FCJA_JWT_EXP_SECONDS", str(12 * 3600)))  # 12 horas


def eh_hash_seguro(valor_senha: str) -> bool:
    """Verifica se a string armazenada no banco já está no formato PBKDF2-HMAC-SHA256."""
    return bool(valor_senha and valor_senha.startswith(f"{PREFIXO_HASH}$"))


def gerar_hash_senha(senha_pura: str) -> str:
    """
    Responsabilidade única: Gerar hash criptográfico seguro de senha com salt aleatório
    usando PBKDF2-HMAC-SHA256 (600.000 iterações).
    """
    if eh_hash_seguro(senha_pura):
        return senha_pura

    salt = secrets.token_hex(16)
    derivado = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITMO,
        senha_pura.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERACOES,
    )
    hash_b64 = base64.b64encode(derivado).decode("ascii").strip()
    return f"{PREFIXO_HASH}${PBKDF2_ITERACOES}${salt}${hash_b64}"


def verificar_senha(senha_informada: str, senha_armazenada: str) -> bool:
    """
    Responsabilidade única: Validar uma senha informada contra o hash armazenado
    em tempo constante (prevenindo timing attacks). Mantém compatibilidade de transição
    caso o registro legado ainda esteja em texto puro antes da migração.
    """
    if not senha_informada or not senha_armazenada:
        return False

    if not eh_hash_seguro(senha_armazenada):
        return hmac.compare_digest(senha_informada.encode("utf-8"), senha_armazenada.encode("utf-8"))

    partes = senha_armazenada.split("$")
    if len(partes) != 4:
        return False

    _, iter_str, salt, hash_esperado_b64 = partes
    try:
        iteracoes = int(iter_str)
    except ValueError:
        return False

    derivado = hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITMO,
        senha_informada.encode("utf-8"),
        salt.encode("utf-8"),
        iteracoes,
    )
    hash_calculado_b64 = base64.b64encode(derivado).decode("ascii").strip()
    return hmac.compare_digest(hash_calculado_b64, hash_esperado_b64)


def _b64url_encode(dados: bytes) -> str:
    return base64.urlsafe_b64encode(dados).rstrip(b"=").decode("ascii")


def _b64url_decode(texto: str) -> bytes:
    padding = "=" * (-len(texto) % 4)
    return base64.urlsafe_b64decode(texto + padding)


def gerar_token_jwt(login: str, nome: str, papel: str) -> str:
    """
    Responsabilidade única: Emitir um token JWT (RFC 7519) assinado com HMAC-SHA256 (HS256)
    contendo a identidade e o papel arquivístico (RBAC) do agente.
    """
    agora = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": login,
        "nome": nome,
        "papel": papel,
        "iat": agora,
        "exp": agora + JWT_EXPIRACAO_SEGUNDOS,
        "iss": "sigad-fcja-earq-v2",
    }

    segmento_header = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    segmento_payload = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    mensagem = f"{segmento_header}.{segmento_payload}".encode("ascii")

    assinatura = hmac.new(JWT_SECRET.encode("utf-8"), mensagem, hashlib.sha256).digest()
    segmento_assinatura = _b64url_encode(assinatura)

    return f"{segmento_header}.{segmento_payload}.{segmento_assinatura}"


def validar_token_jwt(token: str) -> Optional[dict]:
    """
    Responsabilidade única: Verificar a assinatura criptográfica e a validade temporal
    de um token JWT, retornando o payload decodificado ou None se inválido/expirado.
    """
    if not token or token.count(".") != 2:
        return None

    try:
        seg_header, seg_payload, seg_assinatura = token.split(".")
        mensagem = f"{seg_header}.{seg_payload}".encode("ascii")
        assinatura_esperada = hmac.new(
            JWT_SECRET.encode("utf-8"), mensagem, hashlib.sha256
        ).digest()
        assinatura_recebida = _b64url_decode(seg_assinatura)

        if not hmac.compare_digest(assinatura_esperada, assinatura_recebida):
            return None

        payload = json.loads(_b64url_decode(seg_payload).decode("utf-8"))
        exp = int(payload.get("exp", 0))
        if exp < int(time.time()):
            return None

        return payload
    except Exception:
        return None
