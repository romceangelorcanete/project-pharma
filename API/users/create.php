<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

api_require_method('POST');
api_require_roles(['admin']);
api_require_csrf();
$body = api_json_body();

$fullName = trim(is_string($body['fullName'] ?? null) ? $body['fullName'] : '');
$positionTitle = mb_strtoupper(trim(is_string($body['positionTitle'] ?? null) ? $body['positionTitle'] : ''), 'UTF-8');
$username = trim(is_string($body['username'] ?? null) ? $body['username'] : '');
$password = is_string($body['password'] ?? null) ? $body['password'] : '';
$roleName = strtolower(trim(is_string($body['role'] ?? null) ? $body['role'] : ''));
$isActive = $body['isActive'] ?? true;

if ($fullName === '' || mb_strlen($fullName) > 150) {
    api_json(422, ['error' => 'Full name must be between 1 and 150 characters.']);
}
if (mb_strlen($positionTitle) > 100) {
    api_json(422, ['error' => 'Position or title cannot exceed 100 characters.']);
}
if (!preg_match('/^[A-Za-z0-9._-]{3,80}$/', $username)) {
    api_json(422, ['error' => 'Username must be 3-80 characters using letters, numbers, dot, underscore, or hyphen.']);
}
if (strlen($password) < 8) {
    api_json(422, ['error' => 'Password must be at least 8 characters.']);
}
if (!in_array($roleName, ['admin', 'pharmacist'], true)) {
    api_json(422, ['error' => 'Choose either the admin or pharmacist role.']);
}
if (!is_bool($isActive)) {
    api_json(422, ['error' => 'Account status is invalid.']);
}

$connection = api_db();
try {
    $connection->beginTransaction();
    $roleStatement = $connection->prepare('SELECT role_id FROM roles WHERE role_name = :role_name');
    $roleStatement->execute(['role_name' => $roleName]);
    $roleId = $roleStatement->fetchColumn();
    if ($roleId === false) {
        $connection->rollBack();
        api_json(422, ['error' => 'The selected role does not exist in the database.']);
    }

    $insert = $connection->prepare(
        'INSERT INTO users (full_name, position_title, username, password_hash, is_active)
         VALUES (:full_name, :position_title, :username, :password_hash, :is_active)'
    );
    $insert->execute([
        'full_name' => $fullName,
        'position_title' => $positionTitle,
        'username' => $username,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'is_active' => $isActive ? 1 : 0,
    ]);
    $userId = (int) $connection->lastInsertId();

    $linkRole = $connection->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)');
    $linkRole->execute(['user_id' => $userId, 'role_id' => (int) $roleId]);

    $connection->commit();
} catch (PDOException $error) {
    if ($connection->inTransaction()) {
        $connection->rollBack();
    }
    if ($error->getCode() === '23000') {
        api_json(409, ['error' => 'That username already exists.']);
    }
    error_log('Pharmacy API user creation failed: ' . $error->getMessage());
    api_json(500, ['error' => 'Could not create the user account.']);
}

api_json(201, [
    'user' => [
        'id' => $userId,
        'fullName' => $fullName,
        'positionTitle' => $positionTitle,
        'username' => $username,
        'roles' => [$roleName],
        'role' => $roleName,
        'isActive' => $isActive,
        'createdAt' => date('Y-m-d H:i:s'),
    ],
]);
