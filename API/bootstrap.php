<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function api_json(int $status, array $payload): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function api_require_method(string $method): void
{
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== strtoupper($method)) {
        header('Allow: ' . strtoupper($method));
        api_json(405, ['error' => 'Method not allowed.']);
    }
}

function api_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $sessionPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'jvgh-pharma-sessions';
    if (!is_dir($sessionPath) && !mkdir($sessionPath, 0700, true) && !is_dir($sessionPath)) {
        error_log('Pharmacy API could not create its PHP session directory.');
        api_json(500, ['error' => 'Could not initialize a secure login session.']);
    }

    ini_set('session.use_strict_mode', '1');
    session_name('pharma_session');
    session_save_path($sessionPath);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function api_require_csrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';

    if (!is_string($provided) || !is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
        api_json(403, ['error' => 'Your session expired. Refresh the page and try again.']);
    }
}

function api_json_body(): array
{
    $body = file_get_contents('php://input');

    try {
        $data = json_decode($body === false ? '' : $body, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        api_json(400, ['error' => 'Invalid JSON request.']);
    }

    if (!is_array($data)) {
        api_json(400, ['error' => 'Invalid request body.']);
    }

    return $data;
}

function api_db(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) {
        return $connection;
    }

    $configPath = __DIR__ . '/config.local.php';
    if (!is_file($configPath)) {
        api_json(503, ['error' => 'Database is not configured. Copy API/config.example.php to API/config.local.php and set the MySQL credentials.']);
    }

    $config = require $configPath;
    if (!is_array($config)) {
        error_log('Pharmacy API configuration must return an array.');
        api_json(500, ['error' => 'Database configuration is invalid.']);
    }

    foreach (['host', 'port', 'database', 'username', 'password'] as $key) {
        if (!array_key_exists($key, $config)) {
            error_log('Pharmacy API configuration is missing ' . $key . '.');
            api_json(500, ['error' => 'Database configuration is invalid.']);
        }
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        (int) $config['port'],
        $config['database']
    );

    try {
        $connection = new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $error) {
        error_log('Pharmacy API database connection failed: ' . $error->getMessage());
        api_json(503, ['error' => 'Cannot connect to MySQL. Check the API configuration and make sure XAMPP MySQL is running.']);
    }

    return $connection;
}

function api_current_user(PDO $connection): ?array
{
    $userId = $_SESSION['user_id'] ?? null;
    if (!is_int($userId) || $userId < 1) {
        return null;
    }

    try {
        $statement = $connection->prepare(
            'SELECT u.user_id, u.full_name, u.username, u.is_active, r.role_name
             FROM users u
             LEFT JOIN user_roles ur ON ur.user_id = u.user_id
             LEFT JOIN roles r ON r.role_id = ur.role_id
             WHERE u.user_id = :user_id
             ORDER BY r.role_name'
        );
        $statement->execute(['user_id' => $userId]);
        $rows = $statement->fetchAll();
    } catch (PDOException $error) {
        error_log('Pharmacy API session lookup failed: ' . $error->getMessage());
        api_json(500, ['error' => 'Could not verify the current user session.']);
    }

    if ($rows === [] || (int) $rows[0]['is_active'] !== 1) {
        unset($_SESSION['user_id']);
        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        return null;
    }

    $roles = array_values(array_unique(array_filter(array_column($rows, 'role_name'))));
    if ($roles === []) {
        unset($_SESSION['user_id']);
        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        return null;
    }

    return [
        'id' => (int) $rows[0]['user_id'],
        'fullName' => $rows[0]['full_name'],
        'username' => $rows[0]['username'],
        'roles' => $roles,
    ];
}

function api_require_roles(array $allowedRoles): array
{
    api_start_session();
    $user = api_current_user(api_db());
    if ($user === null) {
        api_json(401, ['error' => 'Authentication required.']);
    }

    if (array_intersect($allowedRoles, $user['roles']) === []) {
        api_json(403, ['error' => 'You do not have permission to perform this action.']);
    }

    return $user;
}
