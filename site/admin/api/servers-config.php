<?php
/**
 * 多服务器配置管理 API
 * GET    /servers/config       — 列出所有服务器
 * GET    /servers/config/{id}  — 获取单个服务器
 * POST   /servers/config       — 新增服务器
 * PUT    /servers/config/{id}  — 更新服务器
 * DELETE /servers/config/{id}  — 删除服务器
 *
 * 注意：本文件由 admin/api/index.php 路由引入，框架初始化已在入口完成。
 */

// 仅追加本路由需要的鉴权（入口已做 requireLogin）
Auth::requireSuperAdmin();

/** @var string $path */
$method = Request::method();

// 解析路径中的 ID
$serverId = null;
if (preg_match('#^(\d+)$#', $path, $m)) {
    $serverId = (int) $m[1];
}

// GET /servers/config — 列表
if ($method === 'GET' && $serverId === null) {
    $rows = DB::fetchAll(
        'SELECT * FROM server_configs ORDER BY display_order ASC, id ASC'
    );
    Response::success($rows, 'ok');
}

// GET /servers/config/{id} — 单个
if ($method === 'GET' && $serverId !== null) {
    $row = DB::fetch('SELECT * FROM server_configs WHERE id = ?', [$serverId]);
    if (!$row) {
        Response::error('服务器配置不存在', 404);
    }
    Response::success($row, 'ok');
}

// POST /servers/config — 新增
if ($method === 'POST') {
    $body = Request::body();
    $serverName = trim((string) ($body['server_name'] ?? ''));
    $host = trim((string) ($body['host'] ?? ''));
    $port = isset($body['port']) ? (int) $body['port'] : 25565;
    $queryPort = array_key_exists('query_port', $body) && $body['query_port'] !== '' && $body['query_port'] !== null
        ? (int) $body['query_port']
        : null;
    $protocol = (string) ($body['protocol'] ?? 'java');
    $displayOrder = isset($body['display_order']) ? (int) $body['display_order'] : 0;
    $isDisplayed = isset($body['is_displayed']) ? ($body['is_displayed'] ? 1 : 0) : 1;

    if (!in_array($protocol, ['java', 'bedrock'], true)) {
        Response::error('协议必须为 java 或 bedrock', 422);
    }
    if ($serverName === '') {
        $serverName = 'My Server';
    }
    if ($host === '') {
        $host = '127.0.0.1';
    }

    $now = date('Y-m-d H:i:s');
    $id = DB::insert('server_configs', [
        'server_name'   => $serverName,
        'host'          => $host,
        'port'          => $port,
        'query_port'    => $queryPort,
        'protocol'      => $protocol,
        'display_order' => $displayOrder,
        'is_displayed'  => $isDisplayed,
        'created_at'    => $now,
        'updated_at'    => $now,
    ]);

    $row = DB::fetch('SELECT * FROM server_configs WHERE id = ?', [$id]);
    // 更新 server_address_display 为第一个启用的服务器地址
    $firstDisplayed = DB::fetch(
        'SELECT host, port, protocol FROM server_configs WHERE is_displayed = 1 ORDER BY display_order ASC, id ASC LIMIT 1'
    );
    if ($firstDisplayed) {
        $defaultPort = ($firstDisplayed['protocol'] ?? 'java') === 'bedrock' ? 19132 : 25565;
        $addr = $firstDisplayed['host'];
        if ((int) $firstDisplayed['port'] !== $defaultPort) {
            $addr .= ':' . $firstDisplayed['port'];
        }
        Setting::set('server_address_display', $addr);
    }
    Response::success($row, '服务器已添加');
}

// PUT /servers/config/{id} — 更新
if ($method === 'PUT' && $serverId !== null) {
    $existing = DB::fetch('SELECT id FROM server_configs WHERE id = ?', [$serverId]);
    if (!$existing) {
        Response::error('服务器配置不存在', 404);
    }

    $body = Request::body();
    $data = ['updated_at' => date('Y-m-d H:i:s')];

    if (array_key_exists('server_name', $body)) {
        $data['server_name'] = trim((string) $body['server_name']) ?: 'My Server';
    }
    if (array_key_exists('host', $body)) {
        $data['host'] = trim((string) $body['host']) ?: '127.0.0.1';
    }
    if (array_key_exists('port', $body)) {
        $data['port'] = (int) $body['port'];
    }
    if (array_key_exists('query_port', $body)) {
        $data['query_port'] = ($body['query_port'] !== '' && $body['query_port'] !== null)
            ? (int) $body['query_port']
            : null;
    }
    if (array_key_exists('protocol', $body)) {
        $protocol = (string) $body['protocol'];
        if (!in_array($protocol, ['java', 'bedrock'], true)) {
            Response::error('协议必须为 java 或 bedrock', 422);
        }
        $data['protocol'] = $protocol;
    }
    if (array_key_exists('display_order', $body)) {
        $data['display_order'] = (int) $body['display_order'];
    }
    if (array_key_exists('is_displayed', $body)) {
        $data['is_displayed'] = $body['is_displayed'] ? 1 : 0;
    }

    DB::update('server_configs', $data, 'id = ?', [$serverId]);
    $row = DB::fetch('SELECT * FROM server_configs WHERE id = ?', [$serverId]);

    // 清除缓存
    $cacheFile = ROOT_PATH . '/cache/mc_status_all.json';
    if (is_file($cacheFile)) {
        @unlink($cacheFile);
    }

    // 更新 server_address_display 为第一个启用的服务器地址
    $firstDisplayed = DB::fetch(
        'SELECT host, port, protocol FROM server_configs WHERE is_displayed = 1 ORDER BY display_order ASC, id ASC LIMIT 1'
    );
    if ($firstDisplayed) {
        $defaultPort = ($firstDisplayed['protocol'] ?? 'java') === 'bedrock' ? 19132 : 25565;
        $addr = $firstDisplayed['host'];
        if ((int) $firstDisplayed['port'] !== $defaultPort) {
            $addr .= ':' . $firstDisplayed['port'];
        }
        Setting::set('server_address_display', $addr);
    }

    Response::success($row, '服务器配置已保存');
}

// DELETE /servers/config/{id} — 删除
if ($method === 'DELETE' && $serverId !== null) {
    DB::delete('server_configs', 'id = ?', [$serverId]);
    Response::success(null, '服务器已删除');
}

Response::error('方法不允许', 405);
