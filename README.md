# JVGH Pharmacy

React/Vite frontend with a PHP session-authentication API for local XAMPP development.

## Local setup

1. Start Apache and MySQL in XAMPP.

2. In phpMyAdmin, import `API/schema.sql`. It creates the `pharma_inventory` database and the `users`, `roles`, and `user_roles` tables, with `admin` and `pharmacist` roles.
3. Configure MySQL in `API/config.local.php`. This local-only file is ignored by Git; `API/config.example.php` shows the expected settings. The checked-in example uses the standard XAMPP `root` account with an empty password, which is only suitable for a local development machine.
4. Run `npm run dev`. It starts the PHP API and Vite together in one terminal. XAMPP MySQL remains the database server; Apache is only needed for phpMyAdmin.

Create user accounts from a local terminal after importing the schema:

```powershell
.\API\create_user.ps1 -Username admin1 -FullName "Admin Name" -Role admin
password- Annie0123!
.\API\create_user.ps1 -Username pharmacist1 -FullName "Pharmacist Name" -Role pharmacist
```

password- Annie0123!
The script securely prompts for each password (minimum 8 characters) and stores only a PHP password hash. There are no default login accounts.

This first step implements login, logout, session checks, and role recognition. Inventory pages and user-management screens are not implemented yet; use `api_require_roles()` in protected PHP endpoints as those features are added.
