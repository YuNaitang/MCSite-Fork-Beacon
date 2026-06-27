<?php
/**
 * 多服务器状态 API
 * GET /api/servers/status — 返回所有服务器的最新状态
 * GET /api/servers/status/{id} — 返回指定服务器的最新状态
 */
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

$cacheFile = ROOT_PATH . '/cache/mc_status_all.json';
$maxAge = 35;

// 尝试读缓存
if (($_GET['server_id'] ?? '') === '' && is_file($cacheFile) && (time() - filemtime($cacheFile)) <= $maxAge) {
    $raw = file_get_contents($cacheFile);
    $cached = json_decode($raw, true);
    if (is_array($cached)) {
        Response::success($cached);
    }
}

$configs = DB::fetchAll(
    'SELECT id, server_name, host, port, query_port, protocol, display_order
     FROM server_configs
     WHERE is_displayed = 1
     ORDER BY display_order ASC, id ASC'
);

$result = [];

foreach ($configs as $cfg) {
    $serverId = (int) $cfg['id'];

    // 取最新一条状态记录
    $row = DB::fetch(
        'SELECT is_online, online_players, max_players, player_list, version, motd, latency_ms, recorded_at
         FROM server_status_logs
         WHERE server_id = ?
         ORDER BY recorded_at DESC, id DESC
         LIMIT 1',
        [$serverId]
    );

    $players = [];
    $version = null;
    $motd = null;
    $latencyMs = null;
    $queryTime = null;
    $isOnline = false;
    $onlinePlayers = 0;
    $maxPlayers = 0;

    if ($row) {
        $isOnline = (bool) (int) $row['is_online'];
        $onlinePlayers = (int) $row['online_players'];
        $maxPlayers = (int) $row['max_players'];

        $playerListRaw = $row['player_list'];
        if (is_string($playerListRaw) && $playerListRaw !== '') {
            $decoded = json_decode($playerListRaw, true);
            $players = is_array($decoded) ? $decoded : [];
        }

        $version = $row['version'] ?: null;
        $motd = $row['motd'] ?: null;
        $latencyMs = $row['latency_ms'] !== null ? (int) $row['latency_ms'] : null;
        $queryTime = $row['recorded_at'];
    }

    $result[] = [
        'server_id'      => $serverId,
        'server_name'    => $cfg['server_name'],
        'host'           => $cfg['host'],
        'port'           => (int) $cfg['port'],
        'protocol'       => $cfg['protocol'],
        'is_online'      => $isOnline,
        'online_players' => $onlinePlayers,
        'max_players'    => $maxPlayers,
        'player_list'    => $players,
        'version'        => $version,
        'motd'           => $motd,
        'latency_ms'     => $latencyMs,
        'query_time'     => $queryTime,
    ];
}

// 写入缓存
@file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE));

Response::success($result);
