# ==============================================================================
# DOCKERFILE BACKEND — SIGAD FCJA (FastAPI + Gunicorn/Uvicorn + OpenPyXL/Pandas)
# ==============================================================================
FROM python:3.12-slim

LABEL maintainer="Fundação Casa de José Américo (FCJA)"
LABEL description="API Arquivística SIGAD FCJA (FastAPI + SQLAlchemy + Preservação Digital)"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=America/Fortaleza \
    FCJA_PASTA_DADOS=/var/lib/fcja_dados

WORKDIR /app

# Instala utilitários mínimos do sistema (curl para healthcheck e tzdata)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Instala dependências Python com cache de camada otimizado
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copia o código-fonte do backend
COPY . /app

# Garante diretórios persistentes de documentos e pacotes SIP BagIt
RUN mkdir -p /var/lib/fcja_dados/arquivos /var/lib/fcja_dados/pacotes_sip

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/api/estatisticas || exit 1

# Executa com Gunicorn + UvicornWorkers para alta disponibilidade na rede da Fundação
CMD ["gunicorn", "main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]
