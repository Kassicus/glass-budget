# Glass Budget - Windows 11 Deployment Guide

This guide will help you deploy Glass Budget on your Windows 11 PC and make it accessible on your local network.

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 18 or later** installed on your Windows PC
   - Download from: https://nodejs.org/
   - Verify installation: Open Command Prompt and run `node --version`

2. **Git** (optional, for cloning the repository)
   - Download from: https://git-scm.com/download/win
   - Or you can simply copy the project folder to your Windows PC

3. **Administrator access** to your Windows PC
   - Required for installing the Windows service and configuring the firewall

## Deployment Steps

### Step 1: Get the Application on Your Windows PC

**Option A: Using Git**
```cmd
cd C:\
git clone <your-repository-url> glass-budget
cd glass-budget
```

**Option B: Copy Files Manually**
1. Copy the entire project folder to your Windows PC (e.g., `C:\glass-budget`)
2. Open Command Prompt and navigate to the folder: `cd C:\glass-budget`

### Step 2: Configure Environment Variables

1. **Find your Windows PC's local IP address:**
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter (usually starts with `192.168.x.x`)

2. **Create your production environment file:**
   - Copy `.env.production.template` to `.env.production`
   - Open `.env.production` in a text editor

3. **Update the configuration:**
   ```env
   # Database - this will create the database in the 'data' folder
   DATABASE_URL=file:./data/production.db

   # Generate a secure secret using this command in Command Prompt:
   # node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   NEXTAUTH_SECRET=<paste-generated-secret-here>

   # Replace YOUR_WINDOWS_IP with the IP address from step 1
   NEXTAUTH_URL=http://192.168.1.100:3000

   # Production environment
   NODE_ENV=production
   ```

4. **Generate your NEXTAUTH_SECRET:**
   ```cmd
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Copy the output and paste it into your `.env.production` file.

### Step 3: Run the Installation Script

1. **Navigate to the project folder:**
   ```cmd
   cd C:\glass-budget
   ```

2. **Right-click on `scripts\windows\install-service.bat`** and select **"Run as administrator"**

   This script will:
   - ✅ Check for Node.js installation
   - ✅ Create required directories (logs, data)
   - ✅ Install all dependencies
   - ✅ Set up the database
   - ✅ Build the production application
   - ✅ Install PM2 process manager
   - ✅ Configure PM2 as a Windows service
   - ✅ Start the application
   - ✅ Configure Windows Firewall

3. **Wait for installation to complete** (this may take 5-10 minutes)

### Step 4: Create Your First User Account

1. **Open your web browser** and navigate to:
   ```
   http://<YOUR_WINDOWS_IP>:3000
   ```
   Example: `http://192.168.1.100:3000`

2. **Click "Register"** and create your account

3. **You're all set!** The application is now running and will automatically start when Windows boots.

## Accessing the Application

### From the Windows PC
- Open browser and go to: `http://localhost:3000`

### From Other Devices on Your Network
- Open browser and go to: `http://<YOUR_WINDOWS_IP>:3000`
- Example: `http://192.168.1.100:3000`

**Tip:** Bookmark this URL on your devices for easy access!

## Managing the Application

All management scripts are located in `scripts\windows\`. Double-click to run them:

| Script | Purpose |
|--------|---------|
| `status.bat` | Check if the app is running |
| `logs.bat` | View application logs (helpful for troubleshooting) |
| `restart.bat` | Restart the application (use after updates) |
| `stop.bat` | Stop the application |
| `start.bat` | Start the application manually |
| `uninstall-service.bat` | Remove the Windows service (run as admin) |

### Common Tasks

**Check if the app is running:**
```cmd
scripts\windows\status.bat
```

**View recent logs:**
```cmd
scripts\windows\logs.bat
```

**Restart the app:**
```cmd
scripts\windows\restart.bat
```

## Updating the Application

When you make changes to the code and want to deploy them:

1. **Copy/pull the updated code** to your Windows PC

2. **Navigate to the project folder:**
   ```cmd
   cd C:\glass-budget
   ```

3. **Stop the application:**
   ```cmd
   scripts\windows\stop.bat
   ```

4. **Install any new dependencies:**
   ```cmd
   npm install
   ```

5. **Run database migrations (if needed):**
   ```cmd
   npx prisma migrate deploy
   ```

6. **Rebuild the application:**
   ```cmd
   npm run build
   ```

7. **Restart the application:**
   ```cmd
   scripts\windows\restart.bat
   ```

## Backup Your Data

Your SQLite database is stored in the `data` folder. To back it up:

1. **Stop the application:**
   ```cmd
   scripts\windows\stop.bat
   ```

2. **Copy the database file:**
   ```cmd
   copy data\production.db C:\Backups\glass-budget-backup.db
   ```

3. **Restart the application:**
   ```cmd
   scripts\windows\start.bat
   ```

**Tip:** Set up a scheduled task to automatically back up your database regularly!

## Troubleshooting

### The application won't start

1. **Check the logs:**
   ```cmd
   scripts\windows\logs.bat
   ```

2. **Verify Node.js is installed:**
   ```cmd
   node --version
   ```

3. **Check if PM2 is running:**
   ```cmd
   pm2 list
   ```

4. **Verify .env.production is configured correctly**

### Can't access from other devices

1. **Verify Windows Firewall:**
   - Open Windows Defender Firewall
   - Check if "Glass Budget" rule exists in Inbound Rules
   - If not, run `scripts\windows\setup-firewall.bat` as administrator

2. **Check your IP address hasn't changed:**
   ```cmd
   ipconfig
   ```
   - If it changed, update NEXTAUTH_URL in `.env.production` and restart

3. **Verify the app is running:**
   ```cmd
   scripts\windows\status.bat
   ```

### Port 3000 is already in use

If another application is using port 3000:

1. **Edit `ecosystem.config.js`** and add a port configuration:
   ```javascript
   env: {
     NODE_ENV: 'production',
     PORT: '3001', // Change to your preferred port
   },
   ```

2. **Update `.env.production`** with the new port:
   ```env
   NEXTAUTH_URL=http://192.168.1.100:3001
   ```

3. **Update the firewall rule:**
   - Run `scripts\windows\setup-firewall.bat` as admin
   - Or manually update the rule to use the new port

4. **Restart the application**

### Database errors

If you encounter database errors:

1. **Regenerate Prisma client:**
   ```cmd
   npx prisma generate
   ```

2. **Run migrations:**
   ```cmd
   npx prisma migrate deploy
   ```

3. **Restart the application:**
   ```cmd
   scripts\windows\restart.bat
   ```

## Uninstalling

To remove the application from Windows startup:

1. **Right-click `scripts\windows\uninstall-service.bat`** and select **"Run as administrator"**

2. **Optionally remove PM2:**
   ```cmd
   npm uninstall -g pm2 pm2-windows-service
   ```

3. **Delete the project folder** if you no longer need it

4. **Your database and logs are preserved** in the `data` and `logs` folders

## Advanced Configuration

### Using a Custom Domain Name

To access your app via `http://budget.local` instead of an IP address:

1. **Edit hosts file** on each device that needs access:
   - **Windows:** `C:\Windows\System32\drivers\etc\hosts`
   - **macOS/Linux:** `/etc/hosts`

2. **Add this line:**
   ```
   192.168.1.100  budget.local
   ```
   (Replace with your Windows PC's IP address)

3. **Update `.env.production`:**
   ```env
   NEXTAUTH_URL=http://budget.local:3000
   ```

4. **Restart the application**

### Running on Port 80

To access without specifying the port number (`:3000`):

1. **Install a reverse proxy** like nginx for Windows or use IIS

2. **Configure the proxy** to forward port 80 to port 3000

3. **Update `.env.production`:**
   ```env
   NEXTAUTH_URL=http://192.168.1.100
   ```

## Support

If you encounter issues not covered in this guide:

1. Check the logs: `scripts\windows\logs.bat`
2. Review the PM2 process status: `scripts\windows\status.bat`
3. Verify your `.env.production` configuration
4. Ensure Windows Firewall is configured correctly

## Security Notes

- This setup is designed for **local network use only**
- Never expose this application directly to the internet without proper security measures
- Keep your Windows PC updated with the latest security patches
- Regularly back up your database
- Use a strong NEXTAUTH_SECRET (never share it or commit it to git)

Enjoy using Glass Budget!
