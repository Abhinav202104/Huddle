const Message = require('../models/Message');

module.exports = (io, socket) => {
  socket.on('chat-message', async ({ text } = {}) => {
    const roomId = socket.data.roomId; // room comes from the server, never from the client
    if (!roomId || typeof text !== 'string') return;
    const clean = text.trim().slice(0, 2000);
    if (!clean) return;
    try {
      const m = await Message.create({
        roomId,
        sender: socket.data.user.id,
        senderName: socket.data.user.name,
        text: clean,
      });
      io.to(roomId).emit('chat-message', {
        id: m.id,
        senderId: m.sender.toString(),
        senderName: m.senderName,
        text: m.text,
        createdAt: m.createdAt,
      });
    } catch (e) {
      console.error(e);
    }
  });
};
