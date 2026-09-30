const Room = require('../models/Room');
const { isValidRoomId } = require('../utils/roomCode');
const { sendBoard, clearBoard } = require('./whiteboard');

const MAX = Number(process.env.MAX_PARTICIPANTS || 6); // mesh topology limit
let seq = 0;

const cleanMedia = (m = {}) => ({ audio: !!m.audio, video: !!m.video, sharing: !!m.sharing });

module.exports = (io, socket) => {
  socket.on('join-room', async ({ roomId, media } = {}) => {
    try {
      if (!isValidRoomId(roomId) || socket.data.roomId) return;
      const room = await Room.findOne({ roomId, isActive: true });
      if (!room) return socket.emit('room-error', { message: 'Room not found' });
      await Room.updateOne({ _id: room._id }, { $addToSet: { participants: socket.data.user.id } });

      // Check size and join with no await in between so two joins cannot both squeeze in.
      const size = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      if (size >= MAX) return socket.emit('room-error', { message: `This room is full (max ${MAX} people)` });
      socket.data.seq = ++seq;
      socket.data.media = cleanMedia(media);
      socket.data.roomId = roomId;
      socket.join(roomId);

      // The newer peer always sends the offers to older peers, so two people who
      // join at the same moment never send offers to each other (no glare).
      const others = (await io.in(roomId).fetchSockets()).filter(
        (s) => s.id !== socket.id && s.data.seq < socket.data.seq
      );
      socket.emit(
        'room-users',
        others.map((s) => ({ socketId: s.id, user: s.data.user, media: s.data.media }))
      );
      socket.to(roomId).emit('user-joined', { socketId: socket.id, user: socket.data.user });
      sendBoard(socket, roomId);
    } catch (e) {
      console.error(e);
      socket.emit('room-error', { message: 'Could not join the room' });
    }
  });

  // Pure relay: the server never inspects or stores SDP or ICE data.
  ['offer', 'answer', 'ice-candidate'].forEach((evt) => {
    socket.on(evt, (payload = {}) => {
      const roomId = socket.data.roomId;
      const { to } = payload;
      if (!roomId || typeof to !== 'string') return;
      if (!io.sockets.adapter.rooms.get(roomId)?.has(to)) return; // target must be in the same room
      io.to(to).emit(evt, {
        from: socket.id,
        user: socket.data.user,
        media: socket.data.media,
        sdp: payload.sdp,
        candidate: payload.candidate,
      });
    });
  });

  socket.on('media-state', (s) => {
    if (!socket.data.roomId) return;
    socket.data.media = cleanMedia(s);
    socket.to(socket.data.roomId).emit('media-state', { from: socket.id, ...socket.data.media });
  });

  const leave = () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.data.roomId = null;
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', { socketId: socket.id });
    if (!io.sockets.adapter.rooms.get(roomId)) clearBoard(roomId);
  };
  socket.on('leave-room', leave);
  socket.on('disconnect', leave);
};
