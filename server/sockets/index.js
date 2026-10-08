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

  // Same JWT as the REST API. It comes from the handshake auth field, or the cookie as a fallback.
  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = socket.handshake.auth?.token || cookies.accessToken;
      const p = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
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