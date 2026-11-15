#!/usr/bin/env bash
# ==============================================================================
# INICIALIZADOR DOCKER COMPOSE — SIGAD FCJA (Servidor Local Linux / Ubuntu)
# Uso: bash scripts/linux/iniciar_docker_fcja.sh
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_DIR"

echo "=========================================================="
echo "   SIGAD FCJA — IMPLANTAÇÃO VIA DOCKER COMPOSE"
echo "=========================================================="

if ! command -v docker >/dev/null 2>&1; then
    echo "[ERRO] O Docker não está instalado neste servidor."
    echo "Instale com: curl -fsSL https://get.docker.com | sudo sh"
    exit 1
fi

echo "[1/3] Construindo imagens e subindo containers (db, backend, frontend, nginx)..."
docker compose up -d --build

echo ""
echo "[2/3] Verificando status dos containers..."
docker compose ps

IP_LOCAL=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo "=========================================================="
echo "   SISTEMA SIGAD FCJA ATIVO NO SERVIDOR LOCAL!"
echo "=========================================================="
echo " -> Acesso Unificado (Gateway Nginx): http://${IP_LOCAL}:8085"
echo " -> Acesso Frontend Direto:           http://${IP_LOCAL}:8080"
echo " -> Documentação da API (Swagger):    http://${IP_LOCAL}:8000/docs"
echo ""
echo " Comandos úteis:"
echo "   Ver logs em tempo real: docker compose logs -f"
echo "   Reiniciar serviços:     docker compose restart"
echo "   Parar serviços:         docker compose down"
echo "=========================================================="
