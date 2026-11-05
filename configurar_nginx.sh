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
echo " [1/5] Configurando IP Dedicado 192.168.1.115..."
echo "==================================================="
sudo tee /etc/netplan/99-fcja-ged-ip.yaml >/dev/null <<EOF
network:
  version: 2
  ethernets:
    ens18:
      addresses:
        - 192.168.1.115/24
EOF
sudo chmod 600 /etc/netplan/99-fcja-ged-ip.yaml
sudo netplan apply
log_info "IP 192.168.1.115 ativado na interface ens18 (mantendo 192.168.1.110 do AtoM intacto)."

echo ""
echo "==================================================="
echo " [2/5] Verificando instalação do Nginx..."
echo "==================================================="
if ! command -v nginx >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y nginx
fi
log_info "Nginx verificado."

echo ""
echo "==================================================="
echo " [3/5] Copiando configuração para sites-available.."
echo "==================================================="
sudo cp "$NGINX_CONF_SRC" "$NGINX_AVAILABLE"
log_info "Arquivo copiado para $NGINX_AVAILABLE"

echo ""
echo "==================================================="
echo " [4/5] Ativando site fcja-ged (preservando AtoM)..."
echo "==================================================="
sudo ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm -f /etc/nginx/sites-enabled/default
    log_info "Site default removido."
fi

echo ""
echo "==================================================="
echo " [5/5] Validando sintaxe e recarregando Nginx..."
echo "==================================================="
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

echo ""
echo "==================================================="
log_info "PROXY REVERSO NGINX ATIVO COM SUCESSO!"
echo " -> FCJA Docs (GED): http://192.168.1.115"
echo " -> FCJA Docs (Porta Auxiliar): http://192.168.1.110:8085"
echo " -> AtoM (Preservado): http://192.168.1.110"
echo "==================================================="
