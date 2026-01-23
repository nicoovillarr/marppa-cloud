const fs = require('fs');
const path = require('path');

const logDir = path.resolve('./logs');
const logFile = path.join(logDir, 'app.log');

const { MAX_LOG_SIZE } = process.env;
const LOG_BACKUP_COUNT = process.env.LOG_BACKUP_COUNT
  ? parseInt(process.env.LOG_BACKUP_COUNT, 10)
  : 5;

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function timestamp() {
  const now = new Date();
  return `[${now.toISOString().replace('T', ' ').replace('Z', '')}]`;
}

let currentSize = 0;

function getLogFiles() {
  if (!fs.existsSync(logDir)) {
    console.warn(`Log directory ${logDir} does not exist.`);
    return [];
  }

  const fileNames = fs
    .readdirSync(logDir)
    .map((f) => {
      const match = f.match(/^app\.log\.(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n) => n !== null)
    .sort((a, b) => a - b);

  console.log('Existing log files:', fileNames);

  return fileNames;
}

function enforceMaxFiles() {
  const files = getLogFiles();
  files.forEach((n) => {
    if (n > LOG_BACKUP_COUNT) {
      console.log(`Deleting old log file: app.log.${n}`);
      const filePath = path.join(logDir, `app.log.${n}`);
      fs.unlinkSync(filePath);
    }
  });
}

function rotateQueue() {
  const files = getLogFiles().reverse();
  if (files.length > 0 && files[0] >= LOG_BACKUP_COUNT) {
    console.log(`Deleting old log file: app.log.${files[0]}`);
    fs.unlinkSync(path.join(logDir, `app.log.${files[0]}`));
    files.shift();
  }

  for (let n of files) {
    const oldPath = path.join(logDir, `app.log.${n}`);
    const newPath = path.join(logDir, `app.log.${n + 1}`);
    console.log(`Rotating log file: ${oldPath} -> ${newPath}`);
    fs.renameSync(oldPath, newPath);
  }

  if (fs.existsSync(logFile)) {
    console.log(`Rotating current log file: app.log -> app.log.1`);
    fs.renameSync(logFile, path.join(logDir, `app.log.1`));
  }

  currentSize = 0;
}

function rotateOnStartup() {
  enforceMaxFiles();
  if (fs.existsSync(logFile)) {
    const stats = fs.statSync(logFile);
    if (stats.size > 0) rotateQueue();
    else currentSize = stats.size;
  }
}

function writeToFile(level, message) {
  const line = `${timestamp()} [${level}] ${message}\n`;
  const lineSize = Buffer.byteLength(line, 'utf8');

  if (currentSize + lineSize > MAX_LOG_SIZE) rotateQueue();

  fs.appendFileSync(logFile, line, 'utf8');
  currentSize += lineSize;
}

const original = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function formatArgs(args) {
  return args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : a))
    .join(' ');
}

console.log = (...args) => {
  const msg = formatArgs(args);
  original.log(`${timestamp()} [LOG]`, ...args);
  writeToFile('LOG', msg);
};

console.info = (...args) => {
  const msg = formatArgs(args);
  original.info(`${timestamp()} [INFO]`, ...args);
  writeToFile('INFO', msg);
};

console.warn = (...args) => {
  const msg = formatArgs(args);
  original.warn(`${timestamp()} [WARN]`, ...args);
  writeToFile('WARN', msg);
};

console.error = (...args) => {
  const msg = formatArgs(args);
  original.error(`${timestamp()} [ERROR]`, ...args);
  writeToFile('ERROR', msg);
};

rotateOnStartup();

module.exports = console;
