const router = require('express').Router();
const c = require('../controllers/roomController');
const protect = require('../middleware/authMiddleware');
const requireRoomMember = require('../middleware/roomMember');

router.use(protect);
router.get('/', c.myRooms);
router.post('/', c.createRoom);
router.get('/:roomId', c.getRoom);
router.post('/:roomId/join', c.joinRoom);
router.get('/:roomId/messages', requireRoomMember, c.getMessages);

module.exports = router;
