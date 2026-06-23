<?php
require_once 'db.php';

// Get JSON POST payload
$inputData = json_decode(file_get_contents('php://input'), true);
$id = $inputData['id'] ?? null;
$password = $inputData['password'] ?? '';

if ($password !== 'iyatawwa10') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Akses ditolak. Password salah."]);
    exit();
}

if (!$id) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ID foto diperlukan"]);
    exit();
}

try {
    // Fetch photo path to delete file from uploads directory
    $selectSql = "SELECT photo_path FROM sls_photos WHERE id = :id";
    $selectStmt = $conn->prepare($selectSql);
    $selectStmt->execute([':id' => $id]);
    $photo = $selectStmt->fetch();

    if ($photo) {
        // Resolve absolute file path
        $photoPath = __DIR__ . '/../' . $photo['photo_path'];
        if (file_exists($photoPath) && is_file($photoPath)) {
            unlink($photoPath);
        }
    }

    $deleteSql = "DELETE FROM sls_photos WHERE id = :id";
    $deleteStmt = $conn->prepare($deleteSql);
    $deleteStmt->execute([':id' => $id]);

    echo json_encode(["status" => "success", "message" => "Foto berhasil dihapus"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal menghapus foto: " . $e->getMessage()]);
}
?>
