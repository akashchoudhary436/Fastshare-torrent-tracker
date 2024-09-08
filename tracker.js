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
  const udpAddr = trackerServer.udp.address();
  const wsAddr = trackerServer.ws.address();

  console.log(`HTTP tracker: http://www.fastsharetorrent.me:${httpAddr.port}/announce`);
  console.log(`UDP tracker: udp://www.fastsharetorrent.me:${udpAddr.port}`);
  console.log(`WebSocket tracker: ws://www.fastsharetorrent.me:${wsAddr.port}`);
});

// Log events for different actions
trackerServer.on('start', function (addr) {
  console.log('Peer started:', addr);

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
  }

  torrent.peers.add(addr.address);
  console.log(`Added peer ${addr.address} to torrent ${infoHash}`);
});

trackerServer.on('update', function (addr) {
  console.log('Peer updated:', addr);

  const infoHash = addr.infoHash;
  const torrent = torrents.get(infoHash);

  if (torrent) {
    torrent.peers.add(addr.address);
    console.log(`Updated peer ${addr.address} for torrent ${infoHash}`);
  }
});

trackerServer.on('complete', function (addr) {
  console.log('Peer completed:', addr);

  const infoHash = addr.infoHash;
  const torrent = torrents.get(infoHash);

  if (torrent) {
    torrent.complete += 1;
    console.log(`Peer completed for torrent ${infoHash}. Total completes: ${torrent.complete}`);
  }
});

trackerServer.on('stop', function (addr) {
  console.log('Peer stopped:', addr);

  const infoHash = addr.infoHash;
  const torrent = torrents.get(infoHash);

  if (torrent) {
    torrent.peers.delete(addr.address);
    console.log(`Removed peer ${addr.address} from torrent ${infoHash}`);
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

// Start the custom HTTP server
const port = process.env.PORT || 10000; // Set the port explicitly if needed
httpServer.listen(port, () => {
  console.log(`Custom HTTP server is listening on port ${port}...`);
});
