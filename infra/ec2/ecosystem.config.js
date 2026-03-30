module.exports = {
  apps: [
    {
      name: 'mission11',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',

      watch: false,
      autorestart: true,

      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
