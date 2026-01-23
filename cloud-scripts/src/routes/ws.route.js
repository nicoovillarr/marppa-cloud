const express = require('express');
const app = express();

const protect = require('../middlewares/protect.middleware');
const prisma = require('../libs/prisma');

// send websocket message to a specific channel
app.post('/ws', protect, async (req, res) => {
  const { channel, message } = req.body;

  if (!channel || !message) {
    return res.status(400).json({ error: 'Channel and message are required' });
  }

  

  res.json({ success: true });
});

module.exports = app;
