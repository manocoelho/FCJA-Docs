-- ============================================================================
-- SCRIPT DE PROVISIONAMENTO MYSQL - FCJA DOCS (Ubuntu 24.04 LTS)
-- Execução: sudo mysql < setup_mysql.sql
-- ============================================================================

-- 1. Cria o banco de dados com suporte completo a acentuação e UTF-8
CREATE DATABASE IF NOT EXISTS fcja_ged
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- 2. Cria o usuário ged_admin para localhost e 127.0.0.1 usando mysql_native_password
CREATE USER IF NOT EXISTS 'ged_admin'@'localhost'
    IDENTIFIED WITH mysql_native_password BY 'fcja_ged_2026';

CREATE USER IF NOT EXISTS 'ged_admin'@'127.0.0.1'
    IDENTIFIED WITH mysql_native_password BY 'fcja_ged_2026';

-- Garante a atualização da senha/plugin caso o usuário já exista
ALTER USER 'ged_admin'@'localhost'
    IDENTIFIED WITH mysql_native_password BY 'fcja_ged_2026';

ALTER USER 'ged_admin'@'127.0.0.1'
    IDENTIFIED WITH mysql_native_password BY 'fcja_ged_2026';

-- 3. Concede todos os privilégios no banco fcja_ged
GRANT ALL PRIVILEGES ON fcja_ged.* TO 'ged_admin'@'localhost';
GRANT ALL PRIVILEGES ON fcja_ged.* TO 'ged_admin'@'127.0.0.1';

-- 4. Aplica imediatamente as alterações de privilégios
FLUSH PRIVILEGES;
