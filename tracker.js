import { Server } from 'bittorrent-tracker';
import http from 'http';

// In-memory storage for torrents
const torrents = new Map();

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
  // Only log the custom HTTP server startup message
  console.log(`Custom HTTP server is listening on port ${httpAddr.port}...`);
});

trackerServer.on('start', function (addr) {
  const infoHash = addr.infoHash;

  let torrent = torrents.get(infoHash);

  if (!torrent) {
    torrent = {
      infoHash,
      peers: new Set(),
      complete: 0,
      incomplete: 0
    };
    torrents.set(infoHash, torrent);
    // Log only the fact that a new torrent is being seeded
    console.log('New torrent started seeding');
  }

  // Add the peer to the torrent
  torrent.peers.add(addr.address);
});

// Remove detailed logs of 'update', 'complete', or 'stop' events
trackerServer.removeAllListeners('update');
trackerServer.removeAllListeners('complete');
trackerServer.removeAllListeners('stop');

// Create a custom HTTP server to handle the root and other endpoints
const httpServer = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Tracker is live and running on https://www.fastsharetorrent.me!\n');
  } else if (req.url.startsWith('/announce') || req.url.startsWith('/scrape')) {
    // Forward the request to the tracker server
    trackerServer.http.emit('request', req, res);
  } else if (req.url === '/torrents') {
    // Endpoint to get info hashes for all torrents
    const torrentInfoHashes = Array.from(torrents.keys());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(torrentInfoHashes));
  } else {
    // Handle other endpoints if necessary
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

// Start the custom HTTP server
const port = process.env.PORT || 10000; // Set the port explicitly if needed
httpServer.listen(port, () => {
  console.log(`Custom HTTP server is listening on port ${port}...`);
});
