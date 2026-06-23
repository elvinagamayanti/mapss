<?php
require_once 'db.php';

// Get JSON POST payload
$inputData = json_decode(file_get_contents('php://input'), true);
$id = $inputData['id'] ?? null;
$change_type = $inputData['change_type'] ?? '';
$notes = $inputData['notes'] ?? '';
$password = $inputData['password'] ?? '';

if ($password !== 'iyatawwa10') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Akses ditolak. Password salah."]);
    exit();
}

if (!$id || empty($change_type)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ID dan Tipe Perubahan diperlukan"]);
    exit();
}

try {
    $sql = "UPDATE sls_changes SET change_type = :change_type, notes = :notes WHERE id = :id";
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':change_type' => $change_type,
        ':notes' => $notes,
        ':id' => $id
    ]);

    echo json_encode(["status" => "success", "message" => "Laporan perubahan SLS berhasil diperbarui"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal memperbarui laporan: " . $e->getMessage()]);
}
?>
