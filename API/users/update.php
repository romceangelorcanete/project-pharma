<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

api_require_method('POST');
$actor = api_require_roles(['admin']);
api_require_csrf();
$body = api_json_body();

$userId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
$fullName = trim(is_string($body['fullName'] ?? null) ? $body['fullName'] : '');
$username = trim(is_string($body['username'] ?? null) ? $body['username'] : '');
$password = is_string($body['password'] ?? null) ? $body['password'] : '';
$roleName = strtolower(trim(is_string($body['role'] ?? null) ? $body['role'] : ''));
$isActive = $body['isActive'] ?? null;

if ($userId === false || $userId < 1) {
    api_json(422, ['error' => 'User ID is invalid.']);
}
if ($fullName === '' || mb_strlen($fullName) > 150) {
    api_json(422, ['error' => 'Full name must be between 1 and 150 characters.']);
}
if (!preg_match('/^[A-Za-z0-9._-]{3,80}$/', $username)) {
    api_json(422, ['error' => 'Username must be 3-80 characters using letters, numbers, dot, underscore, or hyphen.']);
}
if ($password !== '' && strlen($password) < 8) {
    api_json(422, ['error' => 'Password must be at least 8 characters.']);
}
if (!in_array($roleName, ['admin', 'pharmacist'], true) || !is_bool($isActive)) {
    api_json(422, ['error' => 'Role or account status is invalid.']);
}
if ((int) $userId === (int) $actor['id'] && ($roleName !== 'admin' || !$isActive)) {
    api_json(409, ['error' => 'You cannot remove admin access or deactivate the account you are currently using.']);
}

$connection = api_db();
try {
    $connection->beginTransaction();
    $existing = $connection->prepare(
        'SELECT u.user_id, u.is_active, u.created_at, r.role_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.user_id
         LEFT JOIN roles r ON r.role_id = ur.role_id
         WHERE u.user_id = :user_id
         FOR UPDATE'
    );
    $existing->execute(['user_id' => $userId]);
    $existingRows = $existing->fetchAll();
    if ($existingRows === []) {
        $connection->rollBack();
        api_json(404, ['error' => 'User not found.']);
    }

    $wasAdmin = in_array('admin', array_column($existingRows, 'role_name'), true);
    if ($wasAdmin && (!$isActive || $roleName !== 'admin')) {
        $otherAdmins = $connection->prepare(
            "SELECT COUNT(DISTINCT u.user_id)
             FROM users u
             INNER JOIN user_roles ur ON ur.user_id = u.user_id
             INNER JOIN roles r ON r.role_id = ur.role_id
             WHERE r.role_name = 'admin' AND u.is_active = 1 AND u.user_id <> :user_id"
        );
        $otherAdmins->execute(['user_id' => $userId]);
        if ((int) $otherAdmins->fetchColumn() === 0) {
            $connection->rollBack();
            api_json(409, ['error' => 'At least one active admin account must remain.']);
        }
    }

    $roleStatement = $connection->prepare('SELECT role_id FROM roles WHERE role_name = :role_name');
    $roleStatement->execute(['role_name' => $roleName]);
    $roleId = $roleStatement->fetchColumn();
    if ($roleId === false) {
        $connection->rollBack();
        api_json(422, ['error' => 'The selected role does not exist in the database.']);
    }

    $update = $connection->prepare(
        'UPDATE users
         SET full_name = :full_name, username = :username, is_active = :is_active
         WHERE user_id = :user_id'
    );
    $update->execute([
        'full_name' => $fullName,
        'username' => $username,
        'is_active' => $isActive ? 1 : 0,
        'user_id' => $userId,
    ]);
    if ($password !== '') {
        $passwordUpdate = $connection->prepare('UPDATE users SET password_hash = :password_hash WHERE user_id = :user_id');
        $passwordUpdate->execute([
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'user_id' => $userId,
        ]);
    }

    $removeRoles = $connection->prepare('DELETE FROM user_roles WHERE user_id = :user_id');
    $removeRoles->execute(['user_id' => $userId]);
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
    error_log('Pharmacy API user update failed: ' . $error->getMessage());
    api_json(500, ['error' => 'Could not update the user account.']);
}

api_json(200, [
    'user' => [
        'id' => (int) $userId,
        'fullName' => $fullName,
        'username' => $username,
        'roles' => [$roleName],
        'role' => $roleName,
        'isActive' => $isActive,
        'createdAt' => $existingRows[0]['created_at'] ?? null,
    ],
]);
