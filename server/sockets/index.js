const { Server } = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const registerSignaling = require('./signaling');
const registerChat = require('./chat');
const registerWhiteboard = require('./whiteboard');

module.exports = function initSockets(server) {
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    maxHttpBufferSize: 1e6,
  });

  // Same JWT cookie as the REST API. No token, no socket.
  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const p = jwt.verify(cookies.accessToken, process.env.JWT_ACCESS_SECRET);
      socket.data.user = { id: p.id, name: p.name };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    registerSignaling(io, socket);
    registerChat(io, socket);
    registerWhiteboard(io, socket);
  });

  return io;
};
