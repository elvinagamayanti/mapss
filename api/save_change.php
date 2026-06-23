<?php
require_once 'db.php';

// Get JSON POST payload
$inputData = json_decode(file_get_contents('php://input'), true);

if (!$inputData) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Payload data kosong"]);
    exit();
}

$idsubsls = $inputData['idsubsls'] ?? '';
$nmsls = $inputData['nmsls'] ?? '';
$latitude = $inputData['latitude'] ?? null;
$longitude = $inputData['longitude'] ?? null;
$change_type = $inputData['change_type'] ?? '';
$notes = $inputData['notes'] ?? '';

if (empty($idsubsls) || empty($nmsls) || empty($change_type)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Data wajib (ID SLS, Nama, Tipe Perubahan) tidak lengkap"]);
    exit();
}

try {
    $sql = "INSERT INTO sls_changes (idsubsls, nmsls, latitude, longitude, change_type, notes) 
            VALUES (:idsubsls, :nmsls, :latitude, :longitude, :change_type, :notes)";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':idsubsls' => $idsubsls,
        ':nmsls' => $nmsls,
        ':latitude' => $latitude,
        ':longitude' => $longitude,
        ':change_type' => $change_type,
        ':notes' => $notes
    ]);
    
    echo json_encode([
        "status" => "success",
        "message" => "Laporan Perubahan SLS berhasil disimpan",
        "data" => [
            "id" => $conn->lastInsertId()
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal menyimpan perubahan ke basis data: " . $e->getMessage()
    ]);
}
?>
