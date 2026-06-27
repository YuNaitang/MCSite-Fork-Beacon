<?php
/**
 * 定时任务脚本
 * 宝塔计划任务配置：每分钟执行 php /www/wwwroot/minecraft-site/cron.php
 * 
 * 功能：
 * 1. 每分钟查询所有 MC 服务器状态（第0秒 + 第30秒）
 * 2. 写入数据库日志
 * 3. 写入缓存文件供 API 读取
 * 4. 清理过期的状态日志和限频缓存
 */

require_once __DIR__ . '/core/helpers.php';

if (!file_exists(__DIR__ . '/config.php')) {
    echo "未安装，请先运行 install.php\n";
    exit(1);
}

load_core();
date_default_timezone_set('Asia/Shanghai');

// 查询所有服务器并存储
function queryAllAndStore(): void
{
    $configs = DB::fetchAll(
        'SELECT * FROM server_configs WHERE is_displayed = 1 ORDER BY display_order ASC, id ASC'
    );
    
    if (empty($configs)) {
        echo "[" . date('H:i:s') . "] 未配置服务器，跳过\n";
        return;
    }

    $allStatus = [];

    foreach ($configs as $config) {
        $status = mc_query($config['host'], (int) $config['port'], $config['protocol']);

        DB::insert('server_status_logs', [
            'server_id'      => (int) $config['id'],
            'online_players' => $status['online_players'],
            'max_players'    => $status['max_players'],
            'player_list'    => json_encode($status['player_list']),
            'version'        => $status['version'],
            'motd'           => $status['motd'],
            'latency_ms'     => $status['latency_ms'],
            'is_online'      => $status['is_online'] ? 1 : 0,
            'recorded_at'    => date('Y-m-d H:i:s'),
        ]);

        $allStatus[] = array_merge($status, [
            'server_id'   => (int) $config['id'],
            'server_name' => $config['server_name'],
            'host'        => $config['host'],
            'port'        => (int) $config['port'],
            'protocol'    => $config['protocol'],
            'query_time'  => date('Y-m-d H:i:s'),
        ]);

        $onlineText = $status['is_online'] ? '在线' : '离线';
        echo "[" . date('H:i:s') . "] {$config['server_name']}: {$onlineText} | 人数: {$status['online_players']}/{$status['max_players']}\n";
    }

    // 写多服务器缓存
    @file_put_contents(
        ROOT_PATH . '/cache/mc_status_all.json',
        json_encode($allStatus, JSON_UNESCAPED_UNICODE)
    );

    // 兼容旧版：写第一个服务器的缓存
    if (!empty($allStatus[0])) {
        @file_put_contents(
            ROOT_PATH . '/cache/mc_status.json',
            json_encode($allStatus[0], JSON_UNESCAPED_UNICODE)
        );
    }
}

// 清理过期数据（每天凌晨3点执行一次）
function cleanOldData(): void
{
    $hour = (int) date('H');
    $minute = (int) date('i');

    if ($hour !== 3 || $minute !== 0) return;

    // 清理 7 天前的状态日志
    $cutoff = date('Y-m-d H:i:s', strtotime('-7 days'));
    $deleted = DB::delete('server_status_logs', 'recorded_at < ?', [$cutoff]);
    echo "已清理 {$deleted} 条过期状态日志\n";

    // 清理过期的限频缓存文件
    $cacheDir = ROOT_PATH . '/cache';
    foreach (glob($cacheDir . '/throttle_*.json') as $file) {
        if (filemtime($file) < time() - 3600) {
            @unlink($file);
        }
    }
}

// 执行
$isCli = php_sapi_name() === 'cli';

echo "=== MC 状态查询 " . date('Y-m-d H:i:s') . " ===\n";

queryAllAndStore();

if ($isCli) {
    sleep(30);
    queryAllAndStore();
}

cleanOldData();

echo "=== 完成 ===\n";
