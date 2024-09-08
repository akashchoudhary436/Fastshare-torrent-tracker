import { Server } from 'bittorrent-tracker'

const server = new Server({
  udp: false, // Disable UDP server
  http: false, // Disable HTTP server
  ws: true, // Enable WebSocket server
  stats: true, // Enable web-based statistics
  trustProxy: false, // Enable trusting x-forwarded-for header for remote IP
  filter: function (infoHash, params, cb) {
    // Allow all torrents
    cb(null);
  }
})

// Internal WebSocket server exposed as public property.
server.ws

server.on('error', function (err) {
  // Fatal server error!
  console.log(err.message)
})

server.on('warning', function (err) {
  // Client sent bad data. Probably not a problem, just a buggy client.
  console.log(err.message)
})

server.on('listening', function () {
  // Fired when the WebSocket server is listening

  // WebSocket
  const wsAddr = server.ws.address()
  const wsHost = wsAddr.address !== '::' ? wsAddr.address : 'localhost'
  const wsPort = wsAddr.port
  console.log(`WebSocket tracker: ws://${wsHost}:${wsPort}`)
})

// Start tracker server listening! Use a specific port number.
const port = 8000; // Example port number
const hostname = "0.0.0.0"; // Bind to all available network interfaces
server.listen(port, hostname, () => {
  console.log('Tracker server is listening on port ' + port + '...')
})

// Listen for individual tracker messages from peers:
server.on('start', function (addr) {
  console.log('Got start message from ' + addr)
})

server.on('complete', function (addr) {})
server.on('update', function (addr) {})
server.on('stop', function (addr) {})

// Log current info hashes for all torrents in the tracker server
console.log(Object.keys(server.torrents))

// Note: Removed the example infoHash and related code
