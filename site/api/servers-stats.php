<?php
/**
 * 多服务器 24 小时在线统计 API
 * GET /api/servers/stats?server_id=X
 */
require_once __DIR__ . '/../core/helpers.php';
init_app();
load_core();
cors();

$serverId = isset($_GET['server_id']) ? (int) $_GET['server_id'] : null;

if ($serverId) {
    // 查指定服务器的统计
    $sql = <<<'SQL'
    SELECT
        FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(recorded_at) / 300) * 300) AS time_bucket,
        ROUND(AVG(online_players)) AS avg_players,
        MAX(online_players) AS max_players
    FROM server_status_logs
    WHERE server_id = ? AND recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY time_bucket
    ORDER BY time_bucket
    SQL;
    $rows = DB::fetchAll($sql, [$serverId]);
} else {
    // 查所有服务器汇总
    $sql = <<<'SQL'
    SELECT
        server_id,
        FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(recorded_at) / 300) * 300) AS time_bucket,
        ROUND(AVG(online_players)) AS avg_players,
        MAX(online_players) AS max_players
    FROM server_status_logs
    WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY server_id, time_bucket
    ORDER BY server_id, time_bucket
    SQL;
    $rows = DB::fetchAll($sql);
}

$out = [];
foreach ($rows as $r) {
    $out[] = [
        'server_id'    => isset($r['server_id']) ? (int) $r['server_id'] : $serverId,
        'time'         => $r['time_bucket'],
        'avg_players'  => (int) $r['avg_players'],
        'max_players'  => (int) $r['max_players'],
    ];
}

Response::success($out);
