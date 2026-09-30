const crypto = require('crypto');

const key = () => Buffer.from(process.env.FILE_ENCRYPTION_KEY, 'hex');

// AES-256-GCM: confidentiality + tamper detection. A fresh IV is used for every file.
function encryptBuffer(buf) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(buf), cipher.final()]);
  return { data, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex') };
}

function decryptBuffer(data, ivHex, tagHex) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

module.exports = { encryptBuffer, decryptBuffer };
