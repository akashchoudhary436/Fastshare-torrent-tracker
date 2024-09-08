import { Server } from 'bittorrent-tracker';
import http from 'http';

// In-memory storage for torrents
const torrents = new Map();

// Define ports for different services
const httpPort = process.env.HTTP_PORT || 10000;
const udpPort = process.env.UDP_PORT || 10001;
const wsPort = process.env.WS_PORT || 10002;

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

// Log tracker URLs when all requested servers are listening
server.on('listening', function () {
  try {
    // HTTP
    const httpAddr = server.http.address();
    const httpHost = 'www.fastsharetorrent.me'; // Your domain
    const httpPort = httpAddr.port;
    console.log(`HTTP tracker: http://${httpHost}:${httpPort}/announce`);

    // UDP
    const udpAddr = server.udp.address();
    const udpHost = udpAddr.address;
    const udpPort = udpAddr.port;
    console.log(`UDP tracker: udp://${udpHost}:${udpPort}`);

    // WebSocket
    const wsAddr = server.ws.address();
    const wsHost = 'www.fastsharetorrent.me'; // Your domain
    const wsPort = wsAddr.port;
    console.log(`WebSocket tracker: ws://${wsHost}:${wsPort}`);
  } catch (err) {
    console.error('Error retrieving tracker addresses:', err.message);
  }
});

// Create a custom HTTP server to handle the root and other endpoints
const httpServer = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Tracker is live and running!\n');
  } else if (req.url.startsWith('/announce') || req.url.startsWith('/scrape')) {
    console.log(`Handling ${req.url} request`);
    // Forward the request to the tracker server
    server.http.emit('request', req, res);
  } else if (req.url.startsWith('/torrents')) {
    // Extract infoHash from query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const infoHash = url.searchParams.get('infoHash');

    if (infoHash && server.torrents[infoHash]) {
      const torrent = server.torrents[infoHash];
      console.log('Handling /torrents request for infoHash:', infoHash);

      // Return torrent information
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        infoHash: torrent.infoHash,
        complete: torrent.complete,
        incomplete: torrent.incomplete,
        peers: Array.from(torrent.peers)
      }));
    } else {
      // Handle the case where the infoHash is not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Torrent not found' }));
    }
  } else {
    // Handle other endpoints if necessary
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

// Start the custom HTTP server
httpServer.listen(httpPort, () => {
  console.log(`Custom HTTP server is listening on port ${httpPort}...`);

  // Start tracker server listening
  server.listen(httpPort, '0.0.0.0', () => {
    console.log(`Tracker server is now listening at 0.0.0.0:${httpPort}...`);
  });
});

// Manually start UDP and WebSocket servers with different ports
server.udp.listen(udpPort, '0.0.0.0', () => {
  console.log(`UDP server is now listening on port ${udpPort}...`);
});

server.ws.listen(wsPort, '0.0.0.0', () => {
  console.log(`WebSocket server is now listening on port ${wsPort}...`);
});

// Listen for individual tracker messages from peers
server.on('start', function (addr) {
  console.log('Got start message from ' + addr);
});

server.on('complete', function (addr) {});
server.on('update', function (addr) {});
server.on('stop', function (addr) {});
