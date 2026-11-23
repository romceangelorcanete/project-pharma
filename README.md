# JVGH Pharmacy Inventory System

JVGH Pharmacy Inventory System is a React and Vite application with a PHP API and MySQL database for login and user management. Inventory pages currently use sample data in the browser; they are not connected to MySQL.

## Requirements

- Windows 10 or 11 with PowerShell
- Node.js and npm
- XAMPP with MySQL and PHP (Apache is only needed if you want to open phpMyAdmin)
- A modern browser such as Chrome, Edge, or Firefox

The development launcher looks for PHP at `C:\Program Files\XAMPP\php\php.exe`. If PHP is installed elsewhere, set `PHP_CLI` to your `php.exe` path before running `npm run dev`. The account creation PowerShell helper currently expects the default XAMPP PHP path.

## First-time setup

1. Open XAMPP Control Panel and start **MySQL**. Start **Apache** too if you will use phpMyAdmin.
2. Open phpMyAdmin at `http://localhost/phpmyadmin`, select **Import**, and import `Database/schema.sql`. This creates the `pharma_inventory` database and the required tables and roles. The schema uses `CREATE TABLE IF NOT EXISTS` and does not replace existing tables.
3. Create `API/config.local.php` and add your local MySQL connection settings:

   ```powershell
   @'
   <?php
   declare(strict_types=1);

   return [
       'host' => '127.0.0.1',
       'port' => 3306,
       'database' => 'pharma_inventory',
       'username' => 'root',
       'password' => '',
   ];
   '@ | Set-Content API/config.local.php
   ```

   Set the username and password for your local XAMPP MySQL account. `API/config.local.php` is ignored by Git; do not commit it. If the file already exists, edit it instead of running the command above so you do not overwrite your settings.

4. In PowerShell, open the project folder and install dependencies:

   ```powershell
   cd "C:\Users\Romce\OneDrive\Desktop\Project\project-pharma"
   npm install
   ```

5. Start both the PHP API and Vite frontend, listening on all network interfaces:

   ```powershell
   npm run dev -- --host 0.0.0.0
   ```

6. Open `http://localhost:5173` in your browser. Keep the terminal running while using the app. Press `Ctrl+C` in that terminal to stop both services.

The API listens on `127.0.0.1:8081`; Vite forwards `/api` requests to it. You do not need to start Apache for the app's PHP API because the development launcher starts PHP's built-in server.

## Optional: share a development preview with Cloudflare Tunnel

Cloudflare Quick Tunnels provide a temporary `trycloudflare.com` address for the Vite development server. No domain or Cloudflare account is required.

1. Install `cloudflared` using the Windows MSI linked from the [official Cloudflare Tunnel downloads page](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/).
2. In the first PowerShell terminal, start the app:

   ```powershell
   npm run dev -- --host 0.0.0.0
   ```

3. In a second PowerShell terminal, from any folder, start a tunnel to Vite:

   ```powershell
   cloudflared tunnel --url http://localhost:5173
   ```

4. Open the `https://...trycloudflare.com` address printed in the second terminal. Keep both terminals open; press `Ctrl+C` in the tunnel terminal to stop sharing.

To require Cloudflare's email one-time PIN for a temporary preview, add an allowed email address:

```powershell
cloudflared tunnel --url http://localhost:5173 --allowed-mail "you@example.com"
```

Quick Tunnel addresses are temporary, and anyone who has the address can access the exposed app unless email protection is enabled. Use this only for a short demo with sample data, not real pharmacy or user data.

## Create an account

There are no default login credentials. Create an account from PowerShell in the project folder. Replace the sample values with your own; the username must be unique.

```powershell
.\API\create_user.ps1 -Username "your_admin" -FullName "Admin Name" -Role admin
.\API\create_user.ps1 -Username "your_pharmacist" -FullName "Pharmacist Name" -Role pharmacist
```

The script securely prompts for the password twice. Passwords must be at least 8 characters and are stored as PHP `PASSWORD_DEFAULT` hashes. Passwords are not recoverable from the database hash. Do not store passwords in this README or other project files.

## Useful commands

```powershell
npm run dev       # Start the PHP API and Vite development server
npm run build     # Build the frontend into dist/
npm run preview   # Preview the production frontend build
npm run lint      # Run Oxlint
```

After `npm run build`, the compiled frontend files are in `dist/`. The Cloudflare Quick Tunnel steps above are for the development server started by `npm run dev`; they do not deploy the built app.

## Current data scope

- Login and User Management use the PHP API and `pharma_inventory` MySQL database.
- Regular, Donation, MHMAP, Monthly Consumption, dashboard inventory figures, and related exports use sample/browser data unless a screen explicitly says otherwise.
- Excel export uses the workbook template in `public/templates/` and downloads a copy; it does not import workbook data into MySQL.

## Troubleshooting

- **`ECONNREFUSED 127.0.0.1:8081`:** Check that `npm run dev` started the PHP API and that the configured PHP executable exists.
- **Database is not configured:** Confirm that `API/config.local.php` exists and contains the correct MySQL connection values.
- **Cannot connect to MySQL:** Start MySQL in XAMPP and verify the database name, username, and password in `API/config.local.php`.
- **Login or user management fails:** Confirm that `Database/schema.sql` was imported into the `pharma_inventory` database.

The Vite/PHP development setup is intended for local development. Do not expose it directly to the public internet or use sample inventory figures for operational decisions.
