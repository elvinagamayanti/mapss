-- Create database
CREATE DATABASE IF NOT EXISTS maps_se;
USE maps_se;

-- Table for photos (Dokumentasi, Kendala, Lainnya)
CREATE TABLE IF NOT EXISTS sls_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idsubsls VARCHAR(50) NOT NULL,
    nmsls VARCHAR(150) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    accuracy DOUBLE NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Dokumentasi', 'Kendala', 'Lainnya'
    photo_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for SLS changes (Perubahan Batas, Pemekaran, Penggabungan, Tipe)
CREATE TABLE IF NOT EXISTS sls_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idsubsls VARCHAR(50) NOT NULL,
    nmsls VARCHAR(150) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    change_type VARCHAR(100) NOT NULL, -- 'Perubahan Batas SLS', 'Pemekaran SLS', 'Penggabungan SLS', 'Pergantian Tipe'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
