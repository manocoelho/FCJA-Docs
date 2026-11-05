#!/usr/bin/env bash
# ==============================================================================
# INSTALADOR AUTOMÁTICO DE DEPENDÊNCIAS - FCJA DOCS (Ubuntu 24.04 LTS)
# ==============================================================================
set -euo pipefail

# Garante execução a partir da raiz do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[AVISO]${NC} $1"; }
log_error() { echo -e "${RED}[ERRO]${NC} $1" >&2; }

install_system_deps() {
    echo "==================================================="
    echo " [1/5] Instalando dependências de sistema (apt)..."
    echo "==================================================="
    sudo apt-get update -y
    sudo apt-get install -y \
        python3 \
        python3-venv \
        python3-pip \
        python3-dev \
        build-essential \
        libxml2-dev \
        libxslt1-dev \
        mysql-server \
        curl \
        unzip \
        netcat-openbsd
    log_info "Dependências do Ubuntu e MySQL Server instaladas."
}

setup_mysql_db() {
    echo ""
    echo "==================================================="
    echo " [2/5] Configurando Banco de Dados MySQL..."
    echo "==================================================="
    sudo systemctl enable --now mysql
    if [ -f "$REPO_DIR/scripts/database/setup_mysql.sql" ]; then
        sudo mysql < "$REPO_DIR/scripts/database/setup_mysql.sql"
        log_info "Banco 'fcja_ged' e usuário 'ged_admin' configurados no MySQL."
    else
        log_warn "Arquivo setup_mysql.sql não encontrado em $REPO_DIR/scripts/database/setup_mysql.sql. Pulando provisionamento automático SQL."
    fi
}

ensure_bun() {
    echo ""
    echo "==================================================="
    echo " [3/5] Verificando runtime Bun..."
    echo "==================================================="
    if ! command -v bun >/dev/null 2>&1; then
        log_warn "Bun não encontrado. Instalando Bun..."
        curl -fsSL https://bun.sh/install | bash
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    fi
    log_info "Bun disponível: $(bun --version)"
}

setup_backend() {
    echo ""
    echo "==================================================="
    echo " [4/5] Configurando ambiente virtual Python (venv)..."
    echo "==================================================="
    cd "$REPO_DIR/backend"

    if [ ! -f ".env" ] && [ -f ".env.example" ]; then
        cp .env.example .env
        log_info "Arquivo backend/.env gerado automaticamente a partir de .env.example"
    fi

    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
        log_info "Ambiente virtual criado em backend/.venv"
    fi

    source .venv/bin/activate
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    deactivate

    cd "$REPO_DIR"
    log_info "Backend Python (FastAPI + SQLAlchemy + PyMySQL) configurado!"
}

setup_frontend() {
    echo ""
    echo "==================================================="
    echo " [5/5] Instalando dependências do Frontend (Bun)..."
    echo "==================================================="
    cd "$REPO_DIR/frontend"
    bun install
    cd "$REPO_DIR"
    log_info "Frontend React/Vite configurado com sucesso!"
}

main() {
    echo "==================================================="
    echo "      INSTALADOR AUTOMÁTICO - FCJA DOCS (LINUX)    "
    echo "==================================================="
    install_system_deps
    setup_mysql_db
    ensure_bun
    setup_backend
    setup_frontend

    echo ""
    echo "==================================================="
    log_info "SUCESSO! O ambiente foi montado perfeitamente."
    echo "Execute ./scripts/linux/iniciar_fcja.sh para iniciar o sistema."
    echo "==================================================="
}

main "$@"
