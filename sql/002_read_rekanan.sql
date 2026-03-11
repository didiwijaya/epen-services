-- CQRS READ: Read model rekanan (product_read)
-- Kolom dioptimasi untuk query: list, lookup, search (denormalized)

USE product_read;

CREATE TABLE IF NOT EXISTS rekanan (
  id INT NOT NULL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  npwp VARCHAR(32) NOT NULL,
  npwp_clean VARCHAR(20) NULL COMMENT 'NPWP tanpa titik/dash untuk search',
  kode_usaha VARCHAR(16) NULL,
  alamat VARCHAR(500) NOT NULL,
  kota VARCHAR(100) NULL,
  telepon VARCHAR(32) NULL,
  email VARCHAR(255) NULL,
  kode_swift VARCHAR(32) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'aktif',
  nama_lower VARCHAR(255) NULL COMMENT 'nama lowercase untuk case-insensitive search',
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_status (status),
  KEY idx_nama_lower (nama_lower(100)),
  KEY idx_npwp_clean (npwp_clean),
  KEY idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
