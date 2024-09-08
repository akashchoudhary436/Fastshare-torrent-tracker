import { Server } from 'bittorrent-tracker';
import http from 'http';

// Create a new tracker server instance
const server = new Server({
  udp: true, // Enable UDP server
  http: true, // Enable HTTP server
  ws: true, // Enable WebSocket server
  stats: true, // Enable web-based statistics
  trustProxy: false, // Trust x-forwarded-for header (use with caution)
  filter: function (infoHash, params, cb) {
    // Allow all info hashes
    cb(null);
  }
});

// Handle server events
server.on('error', function (err) {
  console.error('Server error:', err.message);
});

server.on('warning', function (err) {
  console.warn('Server warning:', err.message);
});

server.on('listening', function () {
  const httpAddr = server.http.address();
  const udpAddr = server.udp.address();
  const wsAddr = server.ws.address();

  console.log(`HTTP tracker: http://www.fastsharetorrent.me:${httpAddr.port}/announce`);
  console.log(`UDP tracker: udp://www.fastsharetorrent.me:${udpAddr.port}`);
  console.log(`WebSocket tracker: ws://www.fastsharetorrent.me:${wsAddr.port}`);
});

// Log events for different actions
server.on('start', function (addr) {
  console.log('Peer started:', addr);
});

server.on('update', function (addr) {
  console.log('Peer updated:', addr);
});

server.on('complete', function (addr) {
  console.log('Peer completed:', addr);
});

server.on('stop', function (addr) {
  console.log('Peer stopped:', addr);
});

// Create a custom HTTP server to handle the root endpoint
const httpServer = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Tracker is live and running!\n');
  } else {
    server.http.handle(req, res); // Delegate to the bittorrent-tracker server for other routes
  }
});

// Start the custom HTTP server
const port = process.env.PORT || 10000; // Set the port explicitly if needed
httpServer.listen(port, () => {
  console.log(`Tracker server is listening on port ${port}...`);
});
