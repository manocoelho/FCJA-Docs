#!/usr/bin/env bash
# ==============================================================================
# DESINSTALADOR LIMPO E REVERSÃO - FCJA DOCS
# Remove exclusivamente os serviços, IP secundário, site Nginx e banco do
# FCJA Docs, deixando a máquina original (AtoM 192.168.1.110) 100% no estado original.
# ==============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }

echo "==================================================="
echo " [1/5] Parando e removendo serviços do Systemd..."
echo "==================================================="
sudo systemctl stop fcja-ged-frontend.service fcja-ged-backend.service 2>/dev/null || true
sudo systemctl disable fcja-ged-frontend.service fcja-ged-backend.service 2>/dev/null || true
sudo rm -f /etc/systemd/system/fcja-ged-frontend.service /etc/systemd/system/fcja-ged-backend.service
sudo systemctl daemon-reload
log_info "Serviços fcja-ged removidos do Systemd."

echo ""
echo "==================================================="
echo " [2/5] Removendo site fcja-ged do Nginx..."
echo "==================================================="
sudo rm -f /etc/nginx/sites-enabled/fcja-ged /etc/nginx/sites-available/fcja-ged
sudo nginx -t && sudo systemctl reload nginx
log_info "Configuração Nginx do GED removida (AtoM 100% preservado)."

echo ""
echo "==================================================="
echo " [3/5] Liberando o IP secundário 192.168.1.115..."
echo "==================================================="
if [ -f /etc/netplan/99-fcja-ged-ip.yaml ]; then
    sudo rm -f /etc/netplan/99-fcja-ged-ip.yaml
    sudo netplan apply
    sudo ip addr del 192.168.1.115/24 dev ens18 2>/dev/null || true
    log_info "IP 192.168.1.115 liberado da placa ens18 (192.168.1.110 permanece ativo)."
fi

echo ""
echo "==================================================="
echo " [4/5] Removendo banco fcja_ged e usuário MySQL..."
echo "==================================================="
sudo mysql -e "DROP DATABASE IF EXISTS fcja_ged; DROP USER IF EXISTS 'ged_admin'@'localhost'; DROP USER IF EXISTS 'ged_admin'@'127.0.0.1'; FLUSH PRIVILEGES;"
log_info "Banco fcja_ged removido (banco 'atom' 100% preservado)."

echo ""
echo "==================================================="
echo " [5/5] Removendo pastas /opt/fcja-docs e dados..."
echo "==================================================="
sudo rm -rf /opt/fcja-docs /var/lib/fcja_dados /usr/local/bin/bun
log_info "Pastas do FCJA Docs removidas."

echo ""
echo "==================================================="
log_info "REVERSÃO CONCLUÍDA! A máquina voltou exatamente ao estado original."
echo "==================================================="
