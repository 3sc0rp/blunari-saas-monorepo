#!/usr/bin/env node

// Simple HTTP server to serve the widget test page
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3030;

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  if (req.url === '/' || req.url === '/widget-test.html') {
    try {
      const filePath = path.join(__dirname, 'widget-test.html');
      const content = fs.readFileSync(filePath, 'utf8');
      
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end(content);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Widget test file not found');
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🧪 Widget Test Server running at:`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → http://localhost:${PORT}/widget-test.html`);
  console.log('');
  console.log('📋 Test Features:');
  console.log('   • Full end-to-end booking test');
  console.log('   • Hold creation test');
  console.log('   • Live debug logging');
  console.log('   • Result analysis');
  console.log('');
  console.log('Press Ctrl+C to stop');
});

process.on('SIGINT', () => {
  console.log('\n👋 Stopping test server...');
  process.exit(0);
});