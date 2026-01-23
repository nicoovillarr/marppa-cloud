const WebSocket = require('ws');
const { jwtVerify } = require('jose');

const channels = {};

const clients = {};

const { JWT_SECRET } = process.env;

const init = () => {
  const wss = new WebSocket.Server({ port: process.env.WS_PORT || 8080 });

  wss.on('connection', (socket) => {
    socket.on('message', async (message) => {
      try {
        const parsedMessage = JSON.parse(message);
        const { type, data, token } = parsedMessage;

        if (type === 'AUTH') {
          const { accessToken } = data;
          if (!accessToken) {
            console.log('No access token provided.');
            socket.send(
              JSON.stringify({ type: 'AUTH_FAILURE', message: 'No token' }),
            );
            return;
          }

          try {
            const secret = new TextEncoder().encode(JWT_SECRET);
            const { payload } = await jwtVerify(accessToken, secret);
            socket.userId = payload.userId;
            console.log('✅ WS connected for user', payload.userId);
          } catch (err) {
            console.log('Invalid token provided.');
            socket.send(
              JSON.stringify({
                type: 'AUTH_FAILURE',
                message: 'Invalid token',
              }),
            );
            return;
          }

          const { userId } = socket;
          if (!clients[userId]) {
            clients[userId] = new Map();
          }

          const uuid = randomUuid();
          clients[userId].set(uuid, socket);

          socket.send(
            JSON.stringify({ type: 'AUTH_SUCCESS', data: uuid }),
            (error) => {
              if (error) {
                console.error('Error sending AUTH_SUCCESS:', error);
              }
            },
          );

          console.log(`${userId} authenticated and connected to websocket...`);
        } else if (type === 'PING') {
          socket.send(JSON.stringify({ type: 'PONG' }), (error) => {
            if (error) {
              console.error('Error sending PONG:', error);
            }
          });
        } else {
          const { userId } = socket;
          if (!userId) {
            console.log('Unauthenticated message received. Ignoring.');
            return;
          }

          if (!clients[userId]) {
            console.log(
              `Client ID ${token} not found for user ${userId}. Ignoring message.`,
            );
            return;
          }

          const { channel } = data;

          switch (type) {
            case 'SUBSCRIBE_CHANNEL':
              if (!channels[channel]) {
                channels[channel] = new Set();
              }

              channels[channel].add(userId);

              socket.send(
                JSON.stringify({
                  type: 'SUBSCRIBE_CHANNEL_SUCCEEDED',
                  channel: channel,
                }),
              );

              console.log(`${userId} suscribed to ${channel}`);
              break;

            case 'UNSUBSCRIBE_CHANNEL':
              if (channels[channel] && channels[channel].has(userId)) {
                channels[channel].delete(userId);
              }

              console.log(`${userId} unsubscribed from ${channel}`);
              break;
          }
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });

    socket.on('close', () => {
      for (const userId in clients) {
        if (clients[userId]) {
          clients[userId].forEach((value, key) => {
            if (value === socket) {
              clients[userId].delete(key);
            }
          });
          if (clients[userId].size === 0) {
            delete clients[userId];
          }
        }
      }
      console.log('A client disconnected from websocket...');
    });

    console.log('A client connected to websocket...');
  });

  console.log(`Websocket server started`);
};

const randomUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const sendMessage = (channel, type, data) => {
  if (channels[channel] == null) {
    console.log(`Channel ${channel} does not exist. Ignoring message.`);
    return;
  }

  const message = JSON.stringify({
    type,
    channel,
    data,
  });

  for (const userId of channels[channel]) {
    if (clients[userId] == null) {
      continue;
    }

    for (const ws of clients[userId].values()) {
      ws.send(message);
    }
  }

  console.log(`Broadcast message to ${channel}: ${message}`);
};

/**
 * Send a message to a worker channel
 * @param {Object} worker
 * @param {String} type
 * @param {Object | null} data
 */
const sendWorkerMessage = (worker, type, data) => {
  const { id, ownerId } = worker;
  sendMessage(`hive:worker:${id}`, type, data);
  sendMessage(`company:${ownerId}:hive`, type, { workerId: id, data });
};

/** Send a message to a node channel
 * @param {Object} node
 * @param {String} type
 * @param {Object | null} data
 */
const sendNodeMessage = (node, type, data) => {
  const { id, ownerId } = node;
  sendMessage(`mesh:zone:${id}`, type, data);
  sendMessage(`company:${ownerId}:mesh`, type, { nodeId: id, data });
};

module.exports = {
  init,
  sendWorkerMessage,
  sendNodeMessage,
};
