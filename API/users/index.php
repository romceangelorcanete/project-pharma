<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

api_require_method('GET');
api_require_roles(['admin']);

$connection = api_db();
try {
    $statement = $connection->query(
        'SELECT u.user_id, u.full_name, u.position_title, u.username, u.is_active, u.created_at, r.role_name
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.user_id
         LEFT JOIN roles r ON r.role_id = ur.role_id
         ORDER BY u.user_id, r.role_name'
    );
    $rows = $statement->fetchAll();
} catch (PDOException $error) {
    error_log('Pharmacy API user list failed: ' . $error->getMessage());
    api_json(500, ['error' => 'Could not load user accounts.']);
}

$users = [];
foreach ($rows as $row) {
    $id = (int) $row['user_id'];
    if (!isset($users[$id])) {
        $users[$id] = [
            'id' => $id,
            'fullName' => $row['full_name'],
            'positionTitle' => mb_strtoupper((string) $row['position_title'], 'UTF-8'),
            'username' => $row['username'],
            'roles' => [],
            'isActive' => (int) $row['is_active'] === 1,
            'createdAt' => $row['created_at'],
        ];
    }

    if (is_string($row['role_name']) && $row['role_name'] !== '') {
        $users[$id]['roles'][] = $row['role_name'];
    }
}

foreach ($users as &$user) {
    $user['roles'] = array_values(array_unique($user['roles']));
    $user['role'] = in_array('admin', $user['roles'], true)
        ? 'admin'
        : ($user['roles'][0] ?? '');
}
unset($user);

api_json(200, ['users' => array_values($users)]);
