<?php
require_once 'db.php';

// Get JSON POST payload
$inputData = json_decode(file_get_contents('php://input'), true);

if (!$inputData) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Payload data kosong"]);
    exit();
}

$idsubsls            = $inputData['idsubsls']            ?? '';
$nmsls               = $inputData['nmsls']               ?? '';
$ppl_name            = $inputData['ppl_name']            ?? '';
$pml_name            = $inputData['pml_name']            ?? '';
$latitude            = $inputData['latitude']            ?? null;
$longitude           = $inputData['longitude']           ?? null;
$change_type         = $inputData['change_type']         ?? '';
$ada_perubahan_batas = $inputData['ada_perubahan_batas'] ?? 'tidak';
$ada_perubahan_nama  = $inputData['ada_perubahan_nama']  ?? 'tidak';
$nmsls_baru          = $inputData['nmsls_baru']          ?? $nmsls;
$ketua_sls           = $inputData['ketua_sls']           ?? '';
$notes               = $inputData['notes']               ?? '';

if (empty($idsubsls) || empty($nmsls) || empty($change_type)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Data wajib (ID SLS, Nama, Tipe Perubahan) tidak lengkap"]);
    exit();
}

try {
    $sql = "INSERT INTO sls_changes 
                (idsubsls, nmsls, ppl_name, pml_name, latitude, longitude,
                 change_type, ada_perubahan_batas, ada_perubahan_nama,
                 nmsls_baru, ketua_sls, notes)
            VALUES 
                (:idsubsls, :nmsls, :ppl_name, :pml_name, :latitude, :longitude,
                 :change_type, :ada_perubahan_batas, :ada_perubahan_nama,
                 :nmsls_baru, :ketua_sls, :notes)";

    $stmt = $conn->prepare($sql);
    $stmt->execute([
        ':idsubsls'            => $idsubsls,
        ':nmsls'               => $nmsls,
        ':ppl_name'            => $ppl_name,
        ':pml_name'            => $pml_name,
        ':latitude'            => $latitude,
        ':longitude'           => $longitude,
        ':change_type'         => $change_type,
        ':ada_perubahan_batas' => $ada_perubahan_batas,
        ':ada_perubahan_nama'  => $ada_perubahan_nama,
        ':nmsls_baru'          => $nmsls_baru,
        ':ketua_sls'           => $ketua_sls,
        ':notes'               => $notes,
    ]);

    echo json_encode([
        "status"  => "success",
        "message" => "Laporan Perubahan SLS berhasil disimpan",
        "data"    => ["id" => $conn->lastInsertId()]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => "Gagal menyimpan perubahan ke basis data: " . $e->getMessage()
    ]);
}
?>