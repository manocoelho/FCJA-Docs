from typing import Optional
from pydantic import BaseModel


class EventoFiltroSchema(BaseModel):
    categoria_evento: Optional[str] = None
    tipo_evento: Optional[str] = None
    documento_id: Optional[str] = None
    busca: Optional[str] = None
    limite: int = 100
