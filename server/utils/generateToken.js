const jwt = require('jsonwebtoken');

const cookieBase = () => {
  const sameSite = process.env.COOKIE_SAMESITE || 'lax';
  return {
    httpOnly: true,
    sameSite,
    secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
  };
};

const payload = (u) => ({ id: u.id, name: u.name });
const signAccess = (u) => jwt.sign(payload(u), process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
const signRefresh = (u) => jwt.sign(payload(u), process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

function setAuthCookies(res, user) {
  const base = cookieBase();
  res.cookie('accessToken', signAccess(user), { ...base, maxAge: 15 * 60 * 1000 });
  // Refresh cookie is only sent to the auth routes.
  res.cookie('refreshToken', signRefresh(user), { ...base, path: '/api/auth', maxAge: 7 * 24 * 3600 * 1000 });
}

function clearAuthCookies(res) {
  const base = cookieBase();
  res.clearCookie('accessToken', base);
  res.clearCookie('refreshToken', { ...base, path: '/api/auth' });
}

module.exports = { setAuthCookies, clearAuthCookies, signAccess };