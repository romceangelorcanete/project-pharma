# JVGH Pharmacy

React/Vite frontend with a PHP session-authentication API and MySQL database. The current implementation covers login, logout, session checks, and admin/pharmacist role recognition. Inventory pages and user-management screens are not implemented yet.

## Requirements

- Windows with PowerShell
- Node.js and npm
- XAMPP with MySQL and PHP

The development launcher uses `C:\Program Files\XAMPP\php\php.exe` by default. If PHP is installed elsewhere, set `PHP_CLI` to the path of `php.exe` before starting the app. The account-creation script also expects PHP at this default XAMPP path.

## Setup

1. Start MySQL in the XAMPP Control Panel. Start Apache too if you will use phpMyAdmin.
2. In phpMyAdmin, import `Database/schema.sql` from the server-level Import page. It creates the `pharma_inventory` database and the 13 tables in the pharmacy ERD, then seeds the `admin` and `pharmacist` roles. The schema uses `CREATE TABLE IF NOT EXISTS`, so importing it into the existing database adds missing tables without replacing existing tables or data.
3. Create `API/config.local.php` from `API/config.example.php` and set your local MySQL credentials. This local-only file is ignored by Git. The example uses the standard XAMPP `root` account with an empty password; use that only on a local development machine.
4. Install the JavaScript dependencies:

   ```powershell
   npm install
   ```

5. Start the PHP API and Vite together:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:5173/`. The PHP API listens only on `127.0.0.1:8081`; Vite proxies `/api` requests to it. Keep the terminal open while using the app and press `Ctrl+C` to stop both servers.

## Create login accounts

Run these commands once per account from the project directory. Replace the sample usernames and names with your own; usernames must be unique.

```powershell
.\API\create_user.ps1 -Username "your_admin" -FullName "Admin Name" -Role admin
.\API\create_user.ps1 -Username "your_pharmacist" -FullName "Pharmacist Name" -Role pharmacist
```

password - Annie0123!

The script securely prompts for the password twice. It must be at least 8 characters; there is no configured maximum in the account-creation script. Passwords are stored as PHP `PASSWORD_DEFAULT` hashes, not as readable text. A hash shown in phpMyAdmin cannot be converted back to the original password. Do not put passwords in this README or other project files.

The schema does not create default login accounts, and there is no password-reset screen or command yet. Do not edit `password_hash` directly in phpMyAdmin.

## Development notes

- If Vite reports `ECONNREFUSED 127.0.0.1:8081`, check that `npm run dev` started the PHP API and that the configured PHP executable exists.
- `npm run lint` runs Oxlint.
- `npm run build` creates the production frontend bundle.
- The Vite/PHP development setup is for local development only. Do not expose it to the public internet or use it for real pharmacy data.
