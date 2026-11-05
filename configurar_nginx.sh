#!/usr/bin/env bash
# ==============================================================================
# CONFIGURADOR AUTOMÁTICO DE PROXY REVERSO NGINX - FCJA DOCS (Ubuntu 24.04 LTS)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF_SRC="$SCRIPT_DIR/deploy/nginx/fcja-ged"
NGINX_AVAILABLE="/etc/nginx/sites-available/fcja-ged"
NGINX_ENABLED="/etc/nginx/sites-enabled/fcja-ged"

GREEN='\033[0;32m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[OK]${NC} $1"; }

echo "==================================================="
echo " [1/4] Instalando Nginx (se necessário)..."
echo "==================================================="
sudo apt-get update -y
sudo apt-get install -y nginx
log_info "Nginx instalado."

echo ""
echo "==================================================="
echo " [2/4] Copiando configuração para sites-available.."
echo "==================================================="
sudo cp "$NGINX_CONF_SRC" "$NGINX_AVAILABLE"
log_info "Arquivo copiado para $NGINX_AVAILABLE"

echo ""
echo "==================================================="
echo " [3/4] Ativando o site e removendo site padrão..."
echo "==================================================="
sudo ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm -f /etc/nginx/sites-enabled/default
    log_info "Site default do Nginx desativado."
fi

echo ""
echo "==================================================="
echo " [4/4] Validando sintaxe e reiniciando Nginx..."
echo "==================================================="
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
LOCAL_IP="${LOCAL_IP:-127.0.0.1}"

echo ""
echo "==================================================="
log_info "PROXY REVERSO NGINX ATIVO COM SUCESSO!"
echo " Acesse o sistema diretamente sem portas em:"
echo " -> http://${LOCAL_IP}"
echo "==================================================="
