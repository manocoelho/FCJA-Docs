#!/usr/bin/env bash
# ==============================================================================
# INICIALIZADOR DO SISTEMA GED - FCJA DOCS (Ubuntu 24.04 LTS)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Adiciona Bun ao PATH caso esteja instalado no diretório do usuário
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

BACKEND_PORT=8000
FRONTEND_PORT=8080
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "Desligando os motores e limpando processos..."
    [[ -n "$BACKEND_PID" ]] && kill -TERM "$BACKEND_PID" 2>/dev/null || true
    [[ -n "$FRONTEND_PID" ]] && kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    echo "Sistema desligado com sucesso!"
    exit 0
}

trap cleanup SIGINT SIGTERM

kill_previous_sessions() {
    echo "1/4 - Verificando e limpando sessões antigas..."
    fuser -k "${BACKEND_PORT}/tcp" >/dev/null 2>&1 || true
    fuser -k "${FRONTEND_PORT}/tcp" >/dev/null 2>&1 || true
}

clean_temp_cache() {
    echo "2/4 - Limpando o cache temporário..."
    if [ -d "frontend/.vinxi" ]; then
        rm -rf "frontend/.vinxi"
    fi
}

start_services() {
    echo "3/4 - Ligando os motores (Backend e Frontend)..."

    if [ ! -f "backend/.venv/bin/uvicorn" ]; then
        echo "[ERRO] Ambiente virtual não encontrado em backend/.venv."
        echo "Execute ./instalar_dependencias.sh primeiro."
        exit 1
    fi

    # Inicia Backend FastAPI exposto para a rede local
    (
        cd "$SCRIPT_DIR/backend"
        exec ./.venv/bin/uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT"
    ) &
    BACKEND_PID=$!

    # Inicia Frontend Vite/Bun exposto para a rede local
    (
        cd "$SCRIPT_DIR/frontend"
        exec bun run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT"
    ) &
    FRONTEND_PID=$!
}

wait_for_port() {
    local port=$1
    echo "Aguardando porta ${port} responder..."
    while ! nc -z 127.0.0.1 "$port" >/dev/null 2>&1; do
        sleep 1
    done
}

main() {
    echo "=========================================="
    echo "    PREPARANDO O SISTEMA GED - FCJA       "
    echo "=========================================="
    kill_previous_sessions
    clean_temp_cache
    start_services

    echo "Aguardando inicialização dos módulos..."
    wait_for_port "$BACKEND_PORT"
    wait_for_port "$FRONTEND_PORT"

    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    LOCAL_IP="${LOCAL_IP:-127.0.0.1}"

    echo ""
    echo "=========================================="
    echo "  O SISTEMA ESTÁ RODANDO!                 "
    echo "=========================================="
    echo "  Acesso Local : http://localhost:${FRONTEND_PORT}"
    echo "  Acesso Rede  : http://${LOCAL_IP}:${FRONTEND_PORT}"
    echo "  API Backend  : http://${LOCAL_IP}:${BACKEND_PORT}/docs"
    echo "=========================================="
    echo "Pressione [CTRL+C] para desligar tudo de forma segura."
    echo ""

    wait
}

main "$@"
