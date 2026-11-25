module.exports = {
  apps: [
    {
      name: 'edu-crm-backend',
      script: 'src/server.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};

