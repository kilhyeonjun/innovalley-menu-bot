module.exports = {
  apps: [
    {
      name: 'menu-bot',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true,
      cron_restart: '0 3 * * *', // 매일 새벽 3시 재시작
    },
  ],
};
