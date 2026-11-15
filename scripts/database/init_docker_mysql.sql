-- ==============================================================================
-- INICIALIZAÇÃO AUTOMÁTICA DO CONTAINER MYSQL 8.0 — SIGAD FCJA
-- Executado automaticamente pelo container db em /docker-entrypoint-initdb.d/
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS fcja_ged
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON fcja_ged.* TO 'fcja_user'@'%';
FLUSH PRIVILEGES;
