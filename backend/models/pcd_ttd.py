from sqlalchemy import Column, Integer, String, Text
from database import Base


class ClassePcdModel(Base):
    """
    Entidade Classe do Plano de Classificação de Documentos (PCD) integrada à
    Tabela de Temporalidade e Destinação (TTD) — e-ARQ Brasil v2 (Cap. 1 e Cap. 3).
    Suporta tanto Atividade-Meio (PCDM/APEPB) quanto Atividade-Fim (Pesquisa, Cultura e Acervo FCJA).
    """

    __tablename__ = "classes_pcd"

    id = Column(String(50), primary_key=True, index=True)
    codigo = Column(String(50), unique=True, index=True, nullable=False)
    titulo = Column(String(255), nullable=False)
    tipo_atividade = Column(String(30), index=True, default="Atividade-Fim")  # Atividade-Meio | Atividade-Fim
    funcao = Column(String(255), default="")
    subfuncao = Column(String(255), default="")
    atividade = Column(String(255), default="")

    # Prazos de Guarda e Destinação (TTD - e-ARQ Brasil v2 Seção 5)
    prazo_corrente_anos = Column(Integer, default=2)
    evento_corrente = Column(String(120), default="Conclusão da atividade / encerramento do dossiê")
    prazo_intermediaria_anos = Column(Integer, default=3)
    evento_intermediaria = Column(String(120), default="Cumprimento do prazo na fase corrente")
    destinacao_final = Column(String(40), default="GUARDA_PERMANENTE")  # GUARDA_PERMANENTE | ELIMINACAO
    observacoes_ttd = Column(Text, default="")

    # Governança da Classe (e-ARQ Req. 1.1.7)
    ativa = Column(Integer, default=1)  # 1 = Ativa para novas capturas, 0 = Inativa (histórica)
    criado_em = Column(String(30), default="")
    criado_por = Column(String(100), default="sistema")
