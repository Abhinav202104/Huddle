const crypto = require('crypto');

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz';
const pick = (n) => Array.from(crypto.randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join('');

exports.generateRoomCode = () => `${pick(3)}-${pick(4)}-${pick(3)}`;
exports.isValidRoomId = (id) => typeof id === 'string' && /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(id);
