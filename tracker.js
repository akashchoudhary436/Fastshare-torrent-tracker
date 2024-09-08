import { Server } from 'bittorrent-tracker';
import http from 'http';

// Create a new tracker server instance
const trackerServer = new Server({
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
trackerServer.on('error', function (err) {
  console.error('Server error:', err.message);
});

trackerServer.on('warning', function (err) {
  console.warn('Server warning:', err.message);
});

trackerServer.on('listening', function () {
  const httpAddr = trackerServer.http.address();
  const udpAddr = trackerServer.udp.address();
  const wsAddr = trackerServer.ws.address();

  console.log(`HTTP tracker: http://www.fastsharetorrent.me:${httpAddr.port}/announce`);
  console.log(`UDP tracker: udp://www.fastsharetorrent.me:${udpAddr.port}`);
  console.log(`WebSocket tracker: ws://www.fastsharetorrent.me:${wsAddr.port}`);
});

// Log events for different actions
trackerServer.on('start', function (addr) {
  console.log('Peer started:', addr);
});

trackerServer.on('update', function (addr) {
  console.log('Peer updated:', addr);
});

trackerServer.on('complete', function (addr) {
  console.log('Peer completed:', addr);
});

trackerServer.on('stop', function (addr) {
  console.log('Peer stopped:', addr);
});

// Create a custom HTTP server to handle the root and other endpoints
const httpServer = http.createServer((req, res) => {
  if (req.url === '/') {
    // Handle root endpoint
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Tracker is live and running!\n');
  } else if (req.url.startsWith('/announce')) {
    console.log('Handling /announce request');
    // Delegate to the bittorrent-tracker server for announce endpoint
    trackerServer.http.handle(req, res);
  } else if (req.url.startsWith('/scrape')) {
    console.log('Handling /scrape request');
    // Delegate to the bittorrent-tracker server for scrape endpoint
    trackerServer.http.handle(req, res);
  } else {
    // Handle other endpoints if necessary
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

// Start the custom HTTP server
const port = process.env.PORT || 10000; // Set the port explicitly if needed
httpServer.listen(port, () => {
  console.log(`Tracker server is listening on port ${port}...`);
});
