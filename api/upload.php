<?php
require_once 'db.php';

// Get JSON POST payload
$inputData = json_decode(file_get_contents('php://input'), true);

if (!$inputData) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Payload data kosong"]);
    exit();
}

$image = $inputData['image'] ?? null;
$idsubsls = $inputData['idsubsls'] ?? '';
$nmsls = $inputData['nmsls'] ?? '';
$latitude = $inputData['latitude'] ?? null;
$longitude = $inputData['longitude'] ?? null;
$accuracy = $inputData['accuracy'] ?? 0;
$category = $inputData['category'] ?? 'Lainnya';

if (!$image) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "File gambar diperlukan"]);
    exit();
}

// Setup upload directory
$uploadDir = __DIR__ . '/uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Server-side base64 length safety check (max ~3.5MB base64 string length ≈ 2.5MB raw file)
if (strlen($image) > 3.5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Ukuran data foto terlalu besar (Maksimal 2 MB)"]);
    exit();
}

// Decode base64 image data
if (preg_match('/^data:image\/(\w+);base64,/', $image, $typeMatches)) {
    $base64Data = substr($image, strpos($image, ',') + 1);
    $extension = strtolower($typeMatches[1]);
    
    if (!in_array($extension, ['jpg', 'jpeg', 'png'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Format gambar tidak valid. Hanya JPG/PNG yang didukung."]);
        exit();
    }
    
    $decodedData = base64_decode($base64Data);
    if ($decodedData === false) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Gagal mendekode berkas base64"]);
        exit();
    }
    
    // Strict decoded file size limit: 2 MB
    if (strlen($decodedData) > 2 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Ukuran berkas melebihi batas 2 MB"]);
        exit();
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Struktur gambar tidak valid"]);
    exit();
}

// Clean filename
$cleanSlsName = preg_replace('/[^a-zA-Z0-9]/', '_', $nmsls);
$fileName = 'survey_' . $cleanSlsName . '_' . time() . '.' . $extension;
$destination = $uploadDir . $fileName;

// Save file to uploads folder
if (file_put_contents($destination, $decodedData) === false) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal menyimpan berkas ke server"]);
    exit();
}

// Store record in MySQL
try {
    $sql = "INSERT INTO sls_photos (idsubsls, nmsls, latitude, longitude, accuracy, category, photo_path) 
            VALUES (:idsubsls, :nmsls, :latitude, :longitude, :accuracy, :category, :photo_path)";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':idsubsls' => $idsubsls,
        ':nmsls' => $nmsls,
        ':latitude' => $latitude,
        ':longitude' => $longitude,
        ':accuracy' => $accuracy,
        ':category' => $category,
        ':photo_path' => 'api/uploads/' . $fileName
    ]);
    
    echo json_encode([
        "status" => "success",
        "message" => "Foto berhasil disimpan di server",
        "data" => [
            "id" => $conn->lastInsertId(),
            "photo_url" => 'api/uploads/' . $fileName
        ]
    ]);
} catch (PDOException $e) {
    // Delete file if DB insert fails to maintain cleanliness
    if (file_exists($destination)) {
        unlink($destination);
    }
    
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal merekam data ke basis data: " . $e->getMessage()
    ]);
}
?>
