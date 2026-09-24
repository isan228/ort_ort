/**
 * PM2: pm2 start ecosystem.config.cjs
 *      pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'ort-api',
      cwd: './backend',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
