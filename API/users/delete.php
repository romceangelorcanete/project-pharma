<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

api_require_method('POST');
$actor = api_require_roles(['admin']);
api_require_csrf();
$body = api_json_body();
$userId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);

if ($userId === false || $userId < 1) {
    api_json(422, ['error' => 'User ID is invalid.']);
}
if ((int) $userId === (int) $actor['id']) {
    api_json(409, ['error' => 'You cannot delete the account you are currently using.']);
}

$connection = api_db();
try {
    $connection->beginTransaction();
    $target = $connection->prepare(
        'SELECT u.user_id, u.is_active, r.role_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.user_id
         LEFT JOIN roles r ON r.role_id = ur.role_id
         WHERE u.user_id = :user_id
         FOR UPDATE'
    );
    $target->execute(['user_id' => $userId]);
    $targetRows = $target->fetchAll();
    if ($targetRows === []) {
        $connection->rollBack();
        api_json(404, ['error' => 'User not found.']);
    }

    $isAdmin = in_array('admin', array_column($targetRows, 'role_name'), true);
    if ($isAdmin) {
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

    $delete = $connection->prepare('DELETE FROM users WHERE user_id = :user_id');
    $delete->execute(['user_id' => $userId]);
    $connection->commit();
} catch (PDOException $error) {
    if ($connection->inTransaction()) {
        $connection->rollBack();
    }
    if ($error->getCode() === '23000') {
        api_json(409, ['error' => 'This account has linked stock or count records and cannot be deleted. Set the account to inactive instead.']);
    }
    error_log('Pharmacy API user deletion failed: ' . $error->getMessage());
    api_json(500, ['error' => 'Could not delete the user account.']);
}

api_json(200, ['deletedId' => (int) $userId]);
