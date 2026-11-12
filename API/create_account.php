<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

if ($argc !== 4) {
    fwrite(STDERR, "Usage: php create_account.php <username> \"<full name>\" <admin|pharmacist>\n");
    exit(1);
}

$username = trim($argv[1]);
$fullName = trim($argv[2]);
$roleName = strtolower(trim($argv[3]));

if (!preg_match('/^[A-Za-z0-9._-]{3,80}$/', $username)) {
    fwrite(STDERR, "Username must be 3-80 characters using letters, numbers, dot, underscore, or hyphen.\n");
    exit(1);
}

if ($fullName === '' || mb_strlen($fullName) > 150) {
    fwrite(STDERR, "Full name must be between 1 and 150 characters.\n");
    exit(1);
}

if (!in_array($roleName, ['admin', 'pharmacist'], true)) {
    fwrite(STDERR, "Role must be admin or pharmacist.\n");
    exit(1);
}

$password = rtrim((string) fgets(STDIN), "\r\n");
$confirmation = rtrim((string) fgets(STDIN), "\r\n");

if (strlen($password) < 8) {
    fwrite(STDERR, "Password must be at least 8 characters.\n");
    exit(1);
}

if (!hash_equals($password, $confirmation)) {
    fwrite(STDERR, "Passwords do not match.\n");
    exit(1);
}

$connection = api_db();
try {
    $roleStatement = $connection->prepare('SELECT role_id FROM roles WHERE role_name = :role_name');
    $roleStatement->execute(['role_name' => $roleName]);
    $roleId = $roleStatement->fetchColumn();
} catch (PDOException $error) {
    error_log('Pharmacy role lookup failed: ' . $error->getMessage());
    fwrite(STDERR, "Could not look up the role. Check the database schema.\n");
    exit(1);
}

if ($roleId === false) {
    fwrite(STDERR, "Role not found. Import API/schema.sql first.\n");
    exit(1);
}

try {
    $connection->beginTransaction();
    $userStatement = $connection->prepare(
        'INSERT INTO users (full_name, username, password_hash) VALUES (:full_name, :username, :password_hash)'
    );
    $userStatement->execute([
        'full_name' => $fullName,
        'username' => $username,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);

    $userId = (int) $connection->lastInsertId();
    $roleLink = $connection->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)');
    $roleLink->execute(['user_id' => $userId, 'role_id' => (int) $roleId]);
    $connection->commit();
} catch (PDOException $error) {
    if ($connection->inTransaction()) {
        $connection->rollBack();
    }

    if ($error->getCode() === '23000') {
        fwrite(STDERR, "That username already exists.\n");
        exit(1);
    }

    error_log('Pharmacy user creation failed: ' . $error->getMessage());
    fwrite(STDERR, "Could not create the user. Check the database configuration.\n");
    exit(1);
}

fwrite(STDOUT, "Created {$roleName} account for {$username}.\n");
