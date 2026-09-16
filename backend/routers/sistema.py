from fastapi import APIRouter
import shutil
import os
import platform
import database

router = APIRouter()

@router.get("/api/sistema/status")
def status_sistema():
    try:
        total, used, free = shutil.disk_usage(database.PASTA_DADOS)
        
        tamanho_acervo = 0
        if os.path.exists(database.PASTA_DADOS):
            for dirpath, _, filenames in os.walk(database.PASTA_DADOS):
                for f in filenames:
                    fp = os.path.join(dirpath, f)
                    if not os.path.islink(fp):
                        tamanho_acervo += os.path.getsize(fp)

        return {
            "sucesso": True,
            "pasta": database.PASTA_DADOS,
            "total_bytes": total,
            "usado_bytes": used,
            "livre_bytes": free,
            "acervo_bytes": tamanho_acervo,
            "modo": "LOCAL"
        }
    except Exception as e:
        return {"sucesso": False, "erro": str(e)}

@router.post("/api/sistema/abrir-pasta")
def abrir_pasta_windows():
    try:
        if platform.system() == "Windows":
            os.startfile(database.PASTA_DADOS)
        return {"sucesso": True}
    except Exception as e:
        return {"sucesso": False, "erro": str(e)}