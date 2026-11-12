<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

api_require_method('POST');
api_start_session();
api_require_csrf();

$body = api_json_body();
$username = trim(is_string($body['username'] ?? null) ? $body['username'] : '');
$password = is_string($body['password'] ?? null) ? $body['password'] : '';

if ($username === '' || $password === '') {
    api_json(400, ['error' => 'Enter your username and password.']);
}

$connection = api_db();
try {
    $statement = $connection->prepare(
        'SELECT u.user_id, u.full_name, u.username, u.password_hash, u.is_active, r.role_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.user_id
         LEFT JOIN roles r ON r.role_id = ur.role_id
         WHERE u.username = :username
         ORDER BY r.role_name'
    );
    $statement->execute(['username' => $username]);
    $rows = $statement->fetchAll();
} catch (PDOException $error) {
    error_log('Pharmacy API login lookup failed: ' . $error->getMessage());
    api_json(500, ['error' => 'Could not complete the sign-in request.']);
}

if ($rows === [] || (int) $rows[0]['is_active'] !== 1 || !password_verify($password, $rows[0]['password_hash'])) {
    api_json(401, ['error' => 'Invalid username or password.']);
}

$roles = array_values(array_unique(array_filter(array_column($rows, 'role_name'))));
if ($roles === []) {
    api_json(403, ['error' => 'This account has no assigned role. Contact an administrator.']);
}

if (password_needs_rehash($rows[0]['password_hash'], PASSWORD_DEFAULT)) {
    try {
        $update = $connection->prepare('UPDATE users SET password_hash = :password_hash WHERE user_id = :user_id');
        $update->execute([
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'user_id' => (int) $rows[0]['user_id'],
        ]);
    } catch (PDOException $error) {
        error_log('Pharmacy API password hash update failed: ' . $error->getMessage());
        api_json(500, ['error' => 'Could not complete the sign-in request.']);
    }
}

session_regenerate_id(true);
$_SESSION = [
    'user_id' => (int) $rows[0]['user_id'],
    'csrf_token' => bin2hex(random_bytes(32)),
];

api_json(200, [
    'user' => [
        'id' => (int) $rows[0]['user_id'],
        'fullName' => $rows[0]['full_name'],
        'username' => $rows[0]['username'],
        'roles' => $roles,
    ],
    'csrfToken' => $_SESSION['csrf_token'],
]);
