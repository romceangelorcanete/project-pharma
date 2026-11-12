<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

api_require_method('GET');
api_start_session();

if (!isset($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$user = isset($_SESSION['user_id']) ? api_current_user(api_db()) : null;

api_json(200, [
    'user' => $user,
    'csrfToken' => $_SESSION['csrf_token'],
]);
