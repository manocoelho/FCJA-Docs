#!/usr/bin/env bash
# ==============================================================================
# INSTALADOR DE SERVIÇOS SYSTEMD (DAEMONIZAÇÃO) - FCJA DOCS (Ubuntu 24.04 LTS)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_DIR"

REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME="$(getent passwd "$REAL_USER" | cut -d: -f6)"
SERVICE_GROUP="www-data"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }

echo "==================================================="
echo " [1/4] Preparando binário do Bun e Build Frontend  "
echo "==================================================="
BUN_BIN="$(command -v bun || echo "${REAL_HOME}/.bun/bin/bun")"
if [ ! -x "$BUN_BIN" ]; then
    echo "[ERRO] Bun não encontrado em $BUN_BIN. Rode ./scripts/linux/instalar_dependencias.sh primeiro."
    exit 1
fi

# Cria link simbólico global em /usr/local/bin/bun para execução via systemd
sudo ln -sf "$BUN_BIN" /usr/local/bin/bun
log_info "Bun vinculado em /usr/local/bin/bun"

echo "Gerando build de produção do Frontend..."
sudo -u "$REAL_USER" bash -c "cd '$REPO_DIR/frontend' && /usr/local/bin/bun run build"
log_info "Build de produção concluída."

echo ""
echo "==================================================="
echo " [2/4] Ajustando permissões de pastas do GED       "
echo "==================================================="
sudo usermod -aG "$SERVICE_GROUP" "$REAL_USER" || true
sudo "$REPO_DIR/backend/.venv/bin/python" "$SCRIPT_DIR/gerar_pastas.py"
log_info "Permissões do diretório de dados aplicadas."

echo ""
echo "==================================================="
echo " [3/4] Criando arquivos de serviço no Systemd      "
echo "==================================================="

sudo tee /etc/systemd/system/fcja-ged-backend.service >/dev/null <<EOF
[Unit]
Description=FCJA Docs - Backend API (FastAPI + Gunicorn/Uvicorn)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=${REAL_USER}
Group=${SERVICE_GROUP}
UMask=0002
WorkingDirectory=${REPO_DIR}/backend
Environment="PATH=${REPO_DIR}/backend/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
EnvironmentFile=${REPO_DIR}/backend/.env
ExecStart=${REPO_DIR}/backend/.venv/bin/gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120 --access-logfile - --error-logfile -
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=fcja-ged-backend

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/fcja-ged-frontend.service >/dev/null <<EOF
[Unit]
Description=FCJA Docs - Frontend Web (React + Vite + Bun)
After=network.target fcja-ged-backend.service
Wants=fcja-ged-backend.service

[Service]
Type=simple
User=${REAL_USER}
Group=${SERVICE_GROUP}
WorkingDirectory=${REPO_DIR}/frontend
Environment="NODE_ENV=production"
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/local/bin/bun run preview -- --host 0.0.0.0 --port 8080
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=fcja-ged-frontend

[Install]
WantedBy=multi-user.target
EOF

log_info "Arquivos fcja-ged-backend.service e fcja-ged-frontend.service gravados em /etc/systemd/system/"

echo ""
echo "==================================================="
echo " [4/4] Habilitando e iniciando serviços Systemd    "
echo "==================================================="
sudo systemctl daemon-reload
sudo systemctl enable fcja-ged-backend.service fcja-ged-frontend.service
sudo systemctl restart fcja-ged-backend.service fcja-ged-frontend.service

log_info "Serviços iniciados e configurados para inicialização automática no boot!"
echo ""
sudo systemctl --no-pager status fcja-ged-backend.service fcja-ged-frontend.service || true
