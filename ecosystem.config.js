/**
 * PM2 Ecosystem Configuration for Glass Budget
 *
 * This configuration tells PM2 how to run and manage the application.
 * Used for Windows deployment as a background service.
 */

module.exports = {
  apps: [{
    name: 'glass-budget',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
    },
    env_file: '.env.production',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,
  }],
};
