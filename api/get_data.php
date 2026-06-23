<?php
require_once 'db.php';

try {
    // 1. Fetch photos list
    $photosSql = "SELECT * FROM sls_photos ORDER BY created_at DESC";
    $photosStmt = $conn->query($photosSql);
    $photos = $photosStmt->fetchAll();

    // 2. Fetch SLS change reports list
    $changesSql = "SELECT * FROM sls_changes ORDER BY created_at DESC";
    $changesStmt = $conn->query($changesSql);
    $changes = $changesStmt->fetchAll();

    // 3. Compute statistics
    $statsSql = "SELECT 
                    COUNT(*) as total_photos,
                    SUM(CASE WHEN category = 'Dokumentasi' THEN 1 ELSE 0 END) as total_dokumentasi,
                    SUM(CASE WHEN category = 'Kendala' THEN 1 ELSE 0 END) as total_kendala,
                    SUM(CASE WHEN category = 'Lainnya' THEN 1 ELSE 0 END) as total_lainnya
                 FROM sls_photos";
    $statsStmt = $conn->query($statsSql);
    $stats = $statsStmt->fetch();

    $changesCountSql = "SELECT COUNT(*) as total_changes FROM sls_changes";
    $changesCountStmt = $conn->query($changesCountSql);
    $changesCount = $changesCountStmt->fetch();

    echo json_encode([
        "status" => "success",
        "data" => [
            "photos" => $photos,
            "changes" => $changes,
            "summary" => [
                "total_photos" => (int)($stats['total_photos'] ?? 0),
                "total_dokumentasi" => (int)($stats['total_dokumentasi'] ?? 0),
                "total_kendala" => (int)($stats['total_kendala'] ?? 0),
                "total_lainnya" => (int)($stats['total_lainnya'] ?? 0),
                "total_changes" => (int)($changesCount['total_changes'] ?? 0)
            ]
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal membaca database: " . $e->getMessage()
    ]);
}
?>
