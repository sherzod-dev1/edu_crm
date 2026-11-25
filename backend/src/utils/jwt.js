const jwt = require('jsonwebtoken');

const signToken = (payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', {
    expiresIn
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
};

module.exports = {
  signToken,
  verifyToken
};
