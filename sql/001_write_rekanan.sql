-- CQRS WRITE: Sumber kebenaran rekanan (product_write)
-- Kolom minimal untuk command: create, update, soft-delete

USE product_write;

CREATE TABLE IF NOT EXISTS rekanan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  npwp VARCHAR(32) NOT NULL,
  kode_usaha VARCHAR(16) NULL,
  alamat VARCHAR(500) NOT NULL,
  kota VARCHAR(100) NULL,
  telepon VARCHAR(32) NULL,
  email VARCHAR(255) NULL,
  kode_swift VARCHAR(32) NULL,
  status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_npwp (npwp),
  KEY idx_status (status),
  KEY idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
