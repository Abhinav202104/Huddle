const router = require('express').Router();
const multer = require('multer');
const c = require('../controllers/fileController');
const protect = require('../middleware/authMiddleware');
const requireRoomMember = require('../middleware/roomMember');

// Memory storage so the file can be encrypted before it ever touches the disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });

router.use(protect);
router.get('/download/:id', c.download);
router.get('/room/:roomId', requireRoomMember, c.list);
router.post('/room/:roomId', requireRoomMember, upload.single('file'), c.upload);

module.exports = router;
