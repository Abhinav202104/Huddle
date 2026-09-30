const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const File = require('../models/File');
const Room = require('../models/Room');
const { encryptBuffer, decryptBuffer } = require('../utils/encrypt');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const dto = (f) => ({
  id: f.id,
  name: f.originalName,
  size: f.size,
  mimeType: f.mimeType,
  uploadedBy: f.uploaderName,
  createdAt: f.createdAt,
});

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file received' });
    const { data, iv, tag } = encryptBuffer(req.file.buffer);
    const storedName = crypto.randomUUID();
    await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(UPLOAD_DIR, storedName), data); // ciphertext only

    const file = await File.create({
      roomId: req.room.roomId,
      uploadedBy: req.user.id,
      uploaderName: req.user.name,
      originalName: path.basename(req.file.originalname).slice(0, 200),
      storedName,
      size: req.file.size,
      mimeType: req.file.mimetype,
      iv,
      tag,
    });
    const payload = dto(file);
    req.app.get('io').to(req.room.roomId).emit('file-shared', payload);
    res.status(201).json({ file: payload });
  } catch (e) {
    next(e);
  }
};

exports.list = async (req, res, next) => {
  try {
    const files = await File.find({ roomId: req.room.roomId }).sort({ createdAt: -1 });
    res.json({ files: files.map(dto) });
  } catch (e) {
    next(e);
  }
};

exports.download = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });
    const room = await Room.findOne({ roomId: file.roomId });
    if (!room || !room.participants.some((p) => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'You do not have access to this file' });
    }
    const enc = await fs.promises.readFile(path.join(UPLOAD_DIR, file.storedName));
    const plain = decryptBuffer(enc, file.iv, file.tag);
    res.setHeader('Content-Type', 'application/octet-stream'); // never render user content inline
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.send(plain);
  } catch (e) {
    next(e);
  }
};
