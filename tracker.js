const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config(); // Load environment variables from .env file

// Create Express application
const app = express();

// MongoDB connection URI
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

// Initialize the database
async function initializeDb() {
  if (db) return db;
  await client.connect();
  db = client.db('tracker');
  const collection = db.collection('torrents');
  await collection.createIndex({ info_hash: 1 }, { unique: true });
  return db;
}

// Handle root URL
app.get('/', (req, res) => {
  res.send('Tracker is live');
});

// Handle torrent announce requests
app.get('/announce', async (req, res) => {
  const infoHash = req.query.info_hash;
  const peerId = req.query.peer_id;
  const port = req.query.port;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (!infoHash || !peerId || !port) {
    return res.status(400).send('Missing parameters');
  }

  try {
    const db = await initializeDb();
    const collection = db.collection('torrents');
    let result = await collection.findOne({ info_hash: infoHash });
    let peers = result ? JSON.parse(result.peers) : [];

    // Add new peer
    peers = peers.filter(peer => peer.id !== peerId); // Remove existing peer with the same ID
    peers.push({ id: peerId, ip: ip, port: port });

    // Save updated peer list
    await collection.updateOne(
      { info_hash: infoHash },
      { $set: { peers: JSON.stringify(peers) } },
      { upsert: true }
    );

    res.status(200).json({
      complete: peers.length,
      incomplete: 0,
      peers: peers.map(peer => ({
        ip: peer.ip,
        port: peer.port
      }))
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Database error');
  }
});

// Handle torrent scraping requests (optional)
app.get('/scrape', async (req, res) => {
  const infoHash = req.query.info_hash;

  if (!infoHash) {
    return res.status(400).send('Missing info_hash parameter');
  }

  try {
    const db = await initializeDb();
    const collection = db.collection('torrents');
    const result = await collection.findOne({ info_hash: infoHash });
    const peers = result ? JSON.parse(result.peers) : [];

    res.status(200).json({
      files: [{
        complete: peers.length,
        incomplete: 0
      }]
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Database error');
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  await initializeDb();
  console.log(`Tracker listening on port ${PORT}`);
});
