#!/usr/bin/env bash
# ==============================================================================
# ORQUESTRADOR COMPLETO DE IMPLANTAÇÃO (FASES 1 A 5) - FCJA DOCS (Ubuntu 24.04)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Garante quebras de linha Unix (LF) e permissão de execução em todos os scripts
sed -i 's/\r$//' instalar_dependencias.sh iniciar_fcja.sh instalar_servicos.sh configurar_nginx.sh gerar_pastas.py
chmod +x instalar_dependencias.sh iniciar_fcja.sh instalar_servicos.sh configurar_nginx.sh gerar_pastas.py

echo ">>> INICIANDO FASES 1 E 3: Dependências, Venv, Bun e MySQL..."
./instalar_dependencias.sh

echo ""
echo ">>> INICIANDO FASE 4: Pastas GED, Build Frontend e Serviços Systemd..."
sudo ./instalar_servicos.sh

echo ""
echo ">>> INICIANDO FASE 5: Proxy Reverso Nginx na Porta 80..."
sudo ./configurar_nginx.sh
