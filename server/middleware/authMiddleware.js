const jwt = require('jsonwebtoken');

module.exports = function protect(req, res, next) {
  const token = req.cookies && req.cookies.accessToken;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    const p = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: p.id, name: p.name };
    next();
  } catch {
    res.status(401).json({ message: 'Session expired' });
  }
};
