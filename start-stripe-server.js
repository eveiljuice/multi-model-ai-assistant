const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Stripe server...');

const serverPath = path.join(__dirname, 'server');
const serverProcess = spawn('node', ['server.js'], {
  cwd: serverPath,
  stdio: 'inherit',
  env: { ...process.env }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
});

serverProcess.on('exit', (code) => {
  console.log(`🔄 Server exited with code ${code}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGTERM');
});