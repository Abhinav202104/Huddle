const Room = require('../models/Room');
const { isValidRoomId } = require('../utils/roomCode');

// Allows the request only if the user has joined this room.
module.exports = async function requireRoomMember(req, res, next) {
  try {
    const { roomId } = req.params;
    if (!isValidRoomId(roomId)) return res.status(400).json({ message: 'Invalid room code' });
    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.participants.some((p) => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Join the room first' });
    }
    req.room = room;
    next();
  } catch (e) {
    next(e);
  }
};
