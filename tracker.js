const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Create Express application
const app = express();

// Create SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'tracker.db'));

// Initialize the database
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS torrents (info_hash TEXT PRIMARY KEY, peers TEXT)');
});

// Handle torrent announce requests
app.get('/announce', (req, res) => {
  const infoHash = req.query.info_hash;
  const peerId = req.query.peer_id;
  const port = req.query.port;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (!infoHash || !peerId || !port) {
    return res.status(400).send('Missing parameters');
  }

  // Store or update peer information in the database
  db.serialize(() => {
    db.get('SELECT peers FROM torrents WHERE info_hash = ?', [infoHash], (err, row) => {
      if (err) return res.status(500).send('Database error');
      
      let peers = row ? JSON.parse(row.peers) : [];

      // Add new peer
      peers.push({ id: peerId, ip: ip, port: port });

      // Save updated peer list
      db.run('REPLACE INTO torrents (info_hash, peers) VALUES (?, ?)', [infoHash, JSON.stringify(peers)], (err) => {
        if (err) return res.status(500).send('Database error');
        
        res.send({
          complete: peers.length,
          incomplete: 0,
          peers: peers.map(peer => ({
            ip: peer.ip,
            port: peer.port
          }))
        });
      });
    });
  });
});

// Handle torrent scraping requests (optional)
app.get('/scrape', (req, res) => {
  const infoHash = req.query.info_hash;

  if (!infoHash) {
    return res.status(400).send('Missing info_hash parameter');
  }

  db.get('SELECT peers FROM torrents WHERE info_hash = ?', [infoHash], (err, row) => {
    if (err) return res.status(500).send('Database error');

    res.send({
      files: [{
        complete: row ? JSON.parse(row.peers).length : 0,
        incomplete: 0
      }]
    });
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Tracker listening on port ${PORT}`);
});
