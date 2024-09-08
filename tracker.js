import { Server } from 'bittorrent-tracker';
import http from 'http';
import mongoose from 'mongoose';


// Connect to MongoDB using environment variable
const MONGODB_URI = process.env.MONGODB_URI; // Assume the URI is set in the environment variables
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('strictQuery', false); // Handle deprecation warning

const torrentSchema = new mongoose.Schema({
  infoHash: { type: String, required: true, unique: true },
  peers: [{ type: String }], // List of peer addresses
  complete: { type: Number, default: 0 }, // Number of complete peers
  incomplete: { type: Number, default: 0 }, // Number of incomplete peers
  createdAt: { type: Date, default: Date.now }
});
const Torrent = mongoose.model('Torrent', torrentSchema);

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

// Log events for different actions and save to MongoDB
trackerServer.on('start', async function (addr) {
  console.log('Peer started:', addr);

  const infoHash = addr.infoHash; // Assuming the event provides infoHash
  const torrent = await Torrent.findOne({ infoHash });

  if (!torrent) {
    await Torrent.create({
      infoHash,
      peers: [addr.address],
      complete: 0,
      incomplete: 0
    });
  } else {
    torrent.peers.push(addr.address);
    await torrent.save();
  }
});

trackerServer.on('update', async function (addr) {
  console.log('Peer updated:', addr);

  const infoHash = addr.infoHash; // Assuming the event provides infoHash
  const torrent = await Torrent.findOne({ infoHash });

  if (torrent) {
    // Update peers or other fields as needed
    torrent.peers.push(addr.address);
    await torrent.save();
  }
});

trackerServer.on('complete', async function (addr) {
  console.log('Peer completed:', addr);

  const infoHash = addr.infoHash; // Assuming the event provides infoHash
  const torrent = await Torrent.findOne({ infoHash });

  if (torrent) {
    torrent.complete += 1;
    await torrent.save();
  }
});

trackerServer.on('stop', async function (addr) {
  console.log('Peer stopped:', addr);

  const infoHash = addr.infoHash; // Assuming the event provides infoHash
  const torrent = await Torrent.findOne({ infoHash });

  if (torrent) {
    torrent.peers = torrent.peers.filter(peer => peer !== addr.address);
    await torrent.save();
  }
});

// Create a custom HTTP server to handle the root and other endpoints
const httpServer = http.createServer(async (req, res) => {
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
    const torrents = await Torrent.find({}, 'infoHash');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(torrents.map(t => t.infoHash)));
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
