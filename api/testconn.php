<?php
header("Content-Type: application/json");

$results = [];

$configs = [
    ['host' => '127.0.0.1', 'port' => '8889', 'user' => 'root', 'pass' => 'root'],
    ['host' => 'localhost',  'port' => '8889', 'user' => 'root', 'pass' => 'root'],
    ['host' => '127.0.0.1', 'port' => '3306', 'user' => 'root', 'pass' => ''],
    ['host' => 'localhost',  'port' => '3306', 'user' => 'root', 'pass' => ''],
    ['host' => '127.0.0.1', 'port' => '3306', 'user' => 'root', 'pass' => 'root'],
];

foreach ($configs as $c) {
    try {
        $pdo = new PDO(
            "mysql:host={$c['host']};port={$c['port']};charset=utf8mb4",
            $c['user'], $c['pass'],
            [PDO::ATTR_TIMEOUT => 2]
        );
        echo json_encode(["status" => "SUCCESS", "config" => $c]);
        exit();
    } catch (Exception $e) {
        $results[] = [
            "config" => "{$c['host']}:{$c['port']} user={$c['user']}",
            "error" => $e->getMessage()
        ];
    }
}

echo json_encode(["status" => "ALL FAILED", "errors" => $results]);