exports.notFound = (req, res) => res.status(404).json({ message: 'Route not found' });

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'File is larger than 25 MB' });
  if (err.code === 11000) return res.status(409).json({ message: 'Already exists' });
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid request' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
};
