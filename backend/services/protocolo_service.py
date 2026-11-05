import re
from sqlalchemy.orm import Session
from models.documento import DocumentoModel


def extrair_sigla_curta(sigla: str, nucleo: str) -> str:
    """
    Extrai o identificador curto do núcleo a partir da sigla NOBRADE
    (ex: 'BR_PB_FCJA_GEDA_GOP_PPMD_NRDCARQ' -> 'NRDCARQ') ou gera das iniciais do núcleo.
    """
    if sigla and "_" in sigla:
        ultimo_segmento = sigla.strip().split("_")[-1].upper()
        limpo = re.sub(r"[^A-Z0-9]", "", ultimo_segmento)
        if limpo:
            return limpo[:10]

    if sigla:
        limpo = re.sub(r"[^A-Z0-9]", "", sigla.upper())
        if limpo:
            return limpo[:10]

    palavras = [p for p in re.split(r"\W+", nucleo or "") if len(p) > 2]
    iniciais = "".join(p[0].upper() for p in palavras[:6])
    return iniciais or "GERAL"


def gerar_numero_protocolo(db: Session, sigla: str, nucleo: str, ano: int) -> str:
    """
    Responsabilidade única: Gerar o Número Único de Protocolo / Registro Arquivístico
    (earq.documento.identificador) no padrão: FCJA.<NUCLEO>.<ANO>.<SEQUENCIAL_5_DIGITOS>.
    """
    sigla_curta = extrair_sigla_curta(sigla, nucleo)
    ano_valido = ano if ano and ano > 1900 else 2026
    prefixo = f"FCJA.{sigla_curta}.{ano_valido}."

    existentes = (
        db.query(DocumentoModel.numero_protocolo)
        .filter(DocumentoModel.numero_protocolo.like(f"{prefixo}%"))
        .all()
    )

    maior_seq = 0
    for (prot,) in existentes:
        if prot and prot.startswith(prefixo):
            sufixo = prot[len(prefixo) :]
            if sufixo.isdigit():
                maior_seq = max(maior_seq, int(sufixo))

    proximo = maior_seq + 1
    return f"{prefixo}{proximo:05d}"
