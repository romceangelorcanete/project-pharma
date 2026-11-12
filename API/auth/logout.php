<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

api_require_method('POST');
api_start_session();
api_require_csrf();

session_regenerate_id(true);
$_SESSION = [
    'csrf_token' => bin2hex(random_bytes(32)),
];

api_json(200, [
    'user' => null,
    'csrfToken' => $_SESSION['csrf_token'],
]);
