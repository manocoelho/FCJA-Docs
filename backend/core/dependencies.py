from typing import Optional
from fastapi import Header, HTTPException, Query
from core.security import validar_token_jwt


PAPEIS_VALIDOS = {"pesquisador", "arquivista", "admin"}


def extrair_agente_requisicao(
    authorization: Optional[str] = Header(None),
    usuario_fallback: str = Query("sistema"),
    papel_fallback: str = Query(""),
) -> dict:
    """
    Responsabilidade única: Extrair o agente autenticado a partir do header
    'Authorization: Bearer <JWT>' ou, em modo de transição local, dos parâmetros informados.
    """
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        payload = validar_token_jwt(token)
        if payload:
            return {
                "login": payload.get("sub", ""),
                "nome": payload.get("nome", usuario_fallback or "sistema"),
                "papel": payload.get("papel", papel_fallback or "pesquisador"),
                "autenticado_jwt": True,
            }

    return {
        "login": usuario_fallback or "sistema",
        "nome": usuario_fallback or "sistema",
        "papel": papel_fallback or "pesquisador",
        "autenticado_jwt": False,
    }


def exigir_papeis(agente: dict, papeis_permitidos: set[str], acao_descricao: str) -> None:
    """
    Responsabilidade única: Aplicar controle de acesso baseado em papéis (RBAC - e-ARQ Cap. 7).
    Lança HTTPException 403 caso o papel do agente não possua permissão para a operação.
    """
    papel_atual = (agente.get("papel") or "").lower().strip()
    if papel_atual not in papeis_permitidos:
        papeis_fmt = ", ".join(sorted(papeis_permitidos))
        raise HTTPException(
            status_code=403,
            detail=(
                f"Acesso negado (RBAC e-ARQ Brasil v2): A operação '{acao_descricao}' "
                f"exige perfil [{papeis_fmt}]. Perfil atual: '{papel_atual or 'não identificado'}'."
            ),
        )
