const executeScript = require('./libs/execute-script');

const express = require('express');

const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, `../.env`),
});

const PORT = process.env.PORT || 3000;

const app = express();
const cors = require('cors');
const compression = require('compression');
const protect = require('./middlewares/protect.middleware');

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_, res) => {
  res.json({ status: 'healthy' });
});

app.post('/update-dns', protect, async (req, res) => {
  const { token, zone, record, ip } = req.body;
  if (!token || !zone || !record) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const result = await executeScript('update_dns.sh', [
    token,
    zone,
    record,
    ip,
  ]);

  if (!result) {
    return res.status(500).json({ message: 'Failed to update DNS' });
  }

  res.json({ message: 'DNS update request received' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
