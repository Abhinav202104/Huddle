const Room = require('../models/Room');
const Message = require('../models/Message');
const { generateRoomCode, isValidRoomId } = require('../utils/roomCode');

exports.createRoom = async (req, res, next) => {
  try {
    for (let i = 0; i < 5; i++) {
      const roomId = generateRoomCode();
      try {
        await Room.create({ roomId, host: req.user.id, participants: [req.user.id] });
        return res.status(201).json({ roomId });
      } catch (e) {
        if (e.code !== 11000) throw e; // retry only on a code collision
      }
    }
    res.status(500).json({ message: 'Could not create a room. Try again.' });
  } catch (e) {
    next(e);
  }
};

exports.myRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ participants: req.user.id, isActive: true })
      .sort({ createdAt: -1 })
      .limit(10);
    res.json({
      rooms: rooms.map((r) => ({
        roomId: r.roomId,
        createdAt: r.createdAt,
        participants: r.participants.length,
        isHost: r.host.toString() === req.user.id,
      })),
    });
  } catch (e) {
    next(e);
  }
};

exports.getRoom = async (req, res, next) => {
  try {
    if (!isValidRoomId(req.params.roomId)) return res.status(400).json({ message: 'Invalid room code' });
    const room = await Room.findOne({ roomId: req.params.roomId, isActive: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ room: { roomId: room.roomId, createdAt: room.createdAt } });
  } catch (e) {
    next(e);
  }
};

// Anyone signed in who knows the code may join.
exports.joinRoom = async (req, res, next) => {
  try {
    if (!isValidRoomId(req.params.roomId)) return res.status(400).json({ message: 'Invalid room code' });
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId, isActive: true },
      { $addToSet: { participants: req.user.id } },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: "This room doesn't exist. Check the code and try again." });
    res.json({ room: { roomId: room.roomId } });
  } catch (e) {
    next(e);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const msgs = await Message.find({ roomId: req.room.roomId }).sort({ createdAt: -1 }).limit(200);
    res.json({
      messages: msgs.reverse().map((m) => ({
        id: m.id,
        senderId: m.sender.toString(),
        senderName: m.senderName,
        text: m.text,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
};
