<?php
require_once 'db.php';

// Get JSON POST payload
$inputData = json_decode(file_get_contents('php://input'), true);
$id          = $inputData['id'] ?? null;
$category    = $inputData['category'] ?? '';
$description = $inputData['description'] ?? ''; 
$password    = $inputData['password'] ?? '';

if ($password !== 'iyatawwa10') {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Akses ditolak. Password salah."]);
    exit();
}

if (!$id || empty($category)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ID dan Kategori diperlukan"]);
    exit();
}

try {
    // Update kategori sekaligus deskripsi
    $sql = "UPDATE sls_photos SET category = :category, description = :description WHERE id = :id";
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':category'    => $category,
        ':description' => $description, 
        ':id'          => $id
    ]);

    echo json_encode(["status" => "success", "message" => "Data foto berhasil diperbarui"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal memperbarui data foto: " . $e->getMessage()]);
}
?>