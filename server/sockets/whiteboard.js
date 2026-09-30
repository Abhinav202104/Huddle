// Board state lives in memory so people who join late see what was already drawn.
const boards = new Map();
const MAX_STROKES = 20000;
const num = (v) => typeof v === 'number' && Number.isFinite(v);

module.exports = (io, socket) => {
  socket.on('draw', (s = {}) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    if (![s.x0, s.y0, s.x1, s.y1, s.width].every(num) || typeof s.color !== 'string' || s.color.length > 9) return;
    const stroke = {
      x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1, // 0..1 so any canvas size renders the same drawing
      color: s.color,
      width: Math.min(Math.max(s.width, 1), 40),
    };
    const board = boards.get(roomId) || [];
    board.push(stroke);
    if (board.length > MAX_STROKES) board.shift();
    boards.set(roomId, board);
    socket.to(roomId).emit('draw', stroke);
  });

  socket.on('clear-board', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    boards.delete(roomId);
    socket.to(roomId).emit('clear-board');
  });
};

module.exports.sendBoard = (socket, roomId) => socket.emit('board-state', boards.get(roomId) || []);
module.exports.clearBoard = (roomId) => boards.delete(roomId);
