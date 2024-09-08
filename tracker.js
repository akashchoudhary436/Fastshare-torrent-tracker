import { Server } from 'bittorrent-tracker';

// Create a new tracker server instance
const server = new Server({
  udp: true, // Enable UDP server
  http: true, // Enable HTTP server
  ws: true, // Enable WebSocket server
  stats: true, // Enable web-based statistics
  trustProxy: false, // Trust x-forwarded-for header (use with caution)
  filter: function (infoHash, params, cb) {
    // Example filter to allow only specific torrents
    const allowed = (infoHash === 'aaa67059ed6bd08362da625b3ae77f6f4a075aaa'); // Replace with your own logic
    if (allowed) {
      cb(null); // Allow the torrent
    } else {
      cb(new Error('disallowed torrent')); // Disallow the torrent
    }
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
  // Log the addresses and ports for HTTP, UDP, and WebSocket servers
  const httpAddr = server.http.address();
  console.log(`HTTP tracker: http://${httpAddr.address}:${httpAddr.port}/announce`);

  const udpAddr = server.udp.address();
  console.log(`UDP tracker: udp://${udpAddr.address}:${udpAddr.port}`);

  const wsAddr = server.ws.address();
  console.log(`WebSocket tracker: ws://${wsAddr.address}:${wsAddr.port}`);
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

// Start the tracker server
const port = process.env.PORT || 0; // Use environment PORT or fallback to random port
server.listen(port, () => {
  console.log(`Tracker server is listening on port ${port}...`);
});
