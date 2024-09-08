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

// Log new torrent seeding
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
    // Log the custom HTTP server and new torrent seeding
    console.log(`New torrent started seeding: ${infoHash}`);
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
    res.end('Tracker is live and running!\n');
  } else if (req.url.startsWith('/announce') || req.url.startsWith('/scrape')) {
    console.log(`Handling ${req.url} request`);
    // Forward the request to the tracker server
    trackerServer.http.emit('request', req, res);
  } else if (req.url === '/torrents') {
    console.log('Handling /torrents request');
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

// Function to start the server
function startServer(port) {
  httpServer.listen(port, () => {
    console.log(`Custom HTTP server is listening on port ${port}...`);

    // Now log tracker URLs
    try {
      const httpAddr = trackerServer.http.address();
      const udpAddr = trackerServer.udp.address();
      const wsAddr = trackerServer.ws.address();

      console.log(`HTTP tracker: http://www.fastsharetorrent.me:${httpAddr.port}/announce`);
      console.log(`UDP tracker: udp://www.fastsharetorrent.me:${udpAddr.port}`);
      console.log(`WebSocket tracker: ws://www.fastsharetorrent.me:${wsAddr.port}`);
    } catch (err) {
      console.error('Error retrieving tracker addresses:', err.message);
    }
  });
}

// Determine the port to use
const defaultPort = 10000;
const port = process.env.PORT || defaultPort;

// Start the server
startServer(port);
