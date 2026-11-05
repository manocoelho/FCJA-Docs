#!/usr/bin/env bash
# ==============================================================================
# EXPORTADOR DE BACKUP PARA MIGRAÇÃO DE SERVIDOR - FCJA DOCS
# Gera um pacote único (.tar.gz) com o banco MySQL (fcja_ged) e todos os
# documentos físicos (/var/lib/fcja_dados) para restaurar na nova máquina.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="/tmp/fcja_ged_migration"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FINAL_ARCHIVE="$HOME/backup_fcja_ged_${TIMESTAMP}.tar.gz"

GREEN='\033[0;32m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[OK]${NC} $1"; }

echo "==================================================="
echo " [1/3] Exportando Banco de Dados MySQL (fcja_ged).."
echo "==================================================="
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

sudo mysqldump --databases fcja_ged --single-transaction --routines --triggers > "$BACKUP_DIR/fcja_ged_dump.sql"
log_info "Dump SQL gerado com sucesso."

echo ""
echo "==================================================="
echo " [2/3] Copiando documentos físicos do acervo..."
echo "==================================================="
if [ -d "/var/lib/fcja_dados" ]; then
    sudo cp -a /var/lib/fcja_dados "$BACKUP_DIR/fcja_dados"
    log_info "Arquivos físicos copiados."
fi

echo ""
echo "==================================================="
echo " [3/3] Compactando pacote único de migração..."
echo "==================================================="
sudo tar -czf "$FINAL_ARCHIVE" -C "$BACKUP_DIR" .
sudo chown "$USER:$USER" "$FINAL_ARCHIVE"
sudo rm -rf "$BACKUP_DIR"

echo ""
echo "==================================================="
log_info "BACKUP DE MIGRAÇÃO CONCLUÍDO!"
echo " Arquivo gerado em: $FINAL_ARCHIVE"
echo " Para restaurar na máquina nova após rodar ./scripts/linux/implantar_ubuntu.sh:"
echo "   mkdir -p /tmp/restore && tar -xzf $FINAL_ARCHIVE -C /tmp/restore"
echo "   sudo mysql < /tmp/restore/fcja_ged_dump.sql"
echo "   sudo cp -a /tmp/restore/fcja_dados/. /var/lib/fcja_dados/"
echo "==================================================="
