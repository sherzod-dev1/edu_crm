const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_ACCESS_SECRET = process.env.JWT_SECRET || "access_secret_key_crm_2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_key_crm_2026";

/**
 * Access va Refresh tokenlarni generatsiya qilish
 * @param {Object} payload - Token ichiga yoziladigan ma'lumotlar { id, role }
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const createTokens = (payload) => {
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Refresh tokenni xavfsiz hash qilish
 * @param {string} token - Refresh token
 * @returns {Promise<string>}
 */
const hashToken = async (token) => {
  return await bcrypt.hash(token, 10);
};

/**
 * Tokenni tekshirish
 */
const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_ACCESS_SECRET;
  return jwt.verify(token, secret);
};

module.exports = {
  createTokens,
  hashToken,
  verifyToken,
};
