<?php
// CORS & Output headers for REST API
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

date_default_timezone_set('Asia/Makassar');

$db_name = 'maps_se';

// Multi-fallback database credentials matching MAMP (port 8889) and XAMPP (port 3306)
$configs = [
    // MAMP default (port 8889, root/root)
    ['host' => '127.0.0.1', 'port' => '8889', 'user' => 'root', 'pass' => 'root'],
    ['host' => 'localhost', 'port' => '8889', 'user' => 'root', 'pass' => 'root'],
    // Standar / XAMPP (port 3306, root/no password)
    ['host' => '127.0.0.1', 'port' => '3306', 'user' => 'root', 'pass' => ''],
    ['host' => 'localhost', 'port' => '3306', 'user' => 'root', 'pass' => ''],
    // Standar dengan password (port 3306, root/root)
    ['host' => '127.0.0.1', 'port' => '3306', 'user' => 'root', 'pass' => 'root'],
    ['host' => 'localhost', 'port' => '3306', 'user' => 'root', 'pass' => 'root']
];

$conn = null;
$error = "";

// 1. Coba koneksi ke MySQL server (tanpa memilih database dulu)
foreach ($configs as $config) {
    try {
        $dsn = "mysql:host={$config['host']};port={$config['port']};charset=utf8mb4";
        $conn = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 2
        ]);
        break; // Berhasil terhubung
    } catch (PDOException $e) {
        $error = $e->getMessage();
    }
}

if (!$conn) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal menghubungkan ke database MySQL. Error terakhir: " . $error
    ]);
    exit();
}

try {
    // 2. Buat database jika belum ada
    $conn->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->exec("USE `$db_name`");

    // 3. Buat tabel-tabel jika belum ada
    $conn->exec("
        CREATE TABLE IF NOT EXISTS sls_photos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            idsubsls VARCHAR(50) NOT NULL,
            nmsls VARCHAR(150) NOT NULL,
            latitude DOUBLE NOT NULL,
            longitude DOUBLE NOT NULL,
            accuracy DOUBLE NOT NULL,
            category VARCHAR(50) NOT NULL, -- 'Dokumentasi', 'Kendala', 'Lainnya',
            description TEXT, -- Deskripsi tambahan untuk foto
            photo_path VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $conn->exec("
        CREATE TABLE IF NOT EXISTS sls_changes (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            idsubsls             VARCHAR(50)  NOT NULL,
            nmsls                VARCHAR(150) NOT NULL,
            ppl_name             VARCHAR(150) NOT NULL DEFAULT '',
            pml_name             VARCHAR(150) NOT NULL DEFAULT '',
            latitude             DOUBLE       NOT NULL DEFAULT 0,
            longitude            DOUBLE       NOT NULL DEFAULT 0,
            change_type          VARCHAR(100) NOT NULL,
            ada_perubahan_batas  VARCHAR(10)  NOT NULL DEFAULT 'tidak' COMMENT 'ya/tidak → kode 1/2 di kolom 25 PSLS',
            ada_perubahan_nama   VARCHAR(10)  NOT NULL DEFAULT 'tidak' COMMENT 'ya/tidak',
            nmsls_baru           VARCHAR(150) NOT NULL DEFAULT '' COMMENT 'Nama SLS setelah perubahan (kolom 22 PSLS)',
            ketua_sls            VARCHAR(150) NOT NULL DEFAULT '' COMMENT 'Nama Ketua SLS terkecil (kolom 23 PSLS)',
            notes                TEXT,
            created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal inisialisasi basis data: " . $e->getMessage()
    ]);
    exit();
}
?>
