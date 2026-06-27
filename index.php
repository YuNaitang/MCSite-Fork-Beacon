<?php
/**
 * 前端主题入口
 * 根据后台设置的当前主题，加载对应的 index.html
 */
require_once __DIR__ . '/core/helpers.php';

if (!file_exists(__DIR__ . '/config.php')) {
    header('Location: /install.php');
    exit;
}

load_core();

$theme = Setting::get('current_theme', 'starter');
$theme = preg_replace('/[^a-zA-Z0-9_-]/', '', $theme);
$themePath = __DIR__ . '/themes/' . $theme . '/index.html';

if (!file_exists($themePath)) {
    $theme = 'starter';
    $themePath = __DIR__ . '/themes/starter/index.html';
}

$html = file_get_contents($themePath);
$themeUrl = '/themes/' . $theme . '/';

$html = preg_replace_callback(
    '/((?:src|href)\s*=\s*["\'])(?!\/|https?:\/\/|#|data:)([^"\']+)/',
    function ($m) use ($themeUrl) {
        if (str_starts_with($m[2], '../')) {
            return $m[1] . '/themes/' . substr($m[2], 3);
        }
        return $m[1] . $themeUrl . $m[2];
    },
    $html
);

echo $html;
