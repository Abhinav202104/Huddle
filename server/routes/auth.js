const router = require('express').Router();
const c = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, c.register);
router.post('/login', authLimiter, c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.get('/me', protect, c.me);
router.get('/socket-token', protect, c.socketToken);

module.exports = router;