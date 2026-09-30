const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploaderName: { type: String, required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true }, // random name on disk, never the user's filename
    size: { type: Number, required: true },
    mimeType: { type: String, default: 'application/octet-stream' },
    iv: { type: String, required: true },
    tag: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('File', fileSchema);
