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
    echo json_encode(["status" => "error", "message" => "ID laporan diperlukan"]);
    exit();
}

try {
    $sql = "DELETE FROM sls_changes WHERE id = :id";
    $stmt = $conn->prepare($sql);
    $stmt->execute([':id' => $id]);

    echo json_encode(["status" => "success", "message" => "Laporan perubahan SLS berhasil dihapus"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal menghapus laporan: " . $e->getMessage()]);
}
?>
