-- 実行前にパスワードを変更してください。
-- sudo mysql -u root -p < deploy/mysql-init.sql

CREATE DATABASE IF NOT EXISTS tcc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'tcc_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON tcc.* TO 'tcc_app'@'localhost';
FLUSH PRIVILEGES;
