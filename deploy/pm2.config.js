// PM2 설정 파일
// 사용법: pm2 start pm2.config.js

module.exports = {
  apps: [{
    name: 'wkshop-api',
    script: './dist/index.js',
    cwd: '/var/www/wkshop/server',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/wkshop-api-error.log',
    out_file: '/var/log/pm2/wkshop-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};

