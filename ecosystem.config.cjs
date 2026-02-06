module.exports = {
    apps: [
        {
            name: 'taskpoint-server',
            script: './server/index.js',
            error_file: './logs/server-err.log',
            out_file: './logs/server-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production',
                PORT: 80
            }
        }
    ]
};
