<?php
/**
 * 内容配置管理 API
 * GET  /content — 获取所有内容配置
 * PUT  /content — 保存内容配置
 */
require_once __DIR__ . '/../../core/helpers.php';
init_app();
load_core();
cors();

Auth::requireSuperAdmin();

$method = Request::method();

$contentKeys = [
    // Hero 区域
    'hero_title',
    'hero_subtitle',
    'hero_description',
    'hero_bg_image',

    // 服务器概览区域
    'section_servers_title',
    'section_servers_description',

    // 图集区域
    'section_gallery_title',
    'section_gallery_description',

    // 动态区域
    'section_news_title',
    'section_news_description',

    // 留言区域
    'section_comments_title',
    'section_comments_description',

    // 页脚
    'icp_number',
    'icp_link',
    'footer_copyright',
    'footer_description',

    // 自定义代码
    'custom_head_html',
    'custom_css',
];

if ($method === 'GET') {
    $out = [];
    foreach ($contentKeys as $k) {
        $out[$k] = Setting::get($k, '');
    }
    Response::success($out, 'ok');
}

if ($method === 'PUT') {
    $body = Request::body();
    foreach ($contentKeys as $k) {
        if (array_key_exists($k, $body)) {
            Setting::set($k, (string) $body[$k]);
        }
    }
    Response::success(null, '内容配置已保存');
}

Response::error('方法不允许', 405);
