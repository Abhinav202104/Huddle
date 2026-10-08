const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { setAuthCookies, clearAuthCookies, signAccess } = require('../utils/generateToken');

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
// Used so a missing account takes as long to reject as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    // typeof checks also block NoSQL injection payloads like { "$gt": "" }
    if ([name, email, password].some((v) => typeof v !== 'string')) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (!name.trim()) return res.status(400).json({ message: 'Enter your name' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email, password: hash });
    setAuthCookies(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ message: 'Invalid email or password' });
    setAuthCookies(res, user);
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Session expired' });
    }
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    setAuthCookies(res, user);
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
};

exports.logout = (req, res) => {
  clearAuthCookies(res);
  res.json({ message: 'Signed out' });
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: 'Not authenticated' });
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
};

// The socket connection sends this token in its handshake instead of relying on the cookie.
exports.socketToken = (req, res) => res.json({ token: signAccess(req.user) });