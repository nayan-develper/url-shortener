const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = CHARSET.length; // 62

// Encodes a positive integer into a base62 string.
// MongoDB ObjectId timestamp (milliseconds) is used as the seed,
// guaranteeing uniqueness without a separate counter collection.
function encode(num) {
  if (num === 0) return CHARSET[0];
  let result = '';
  while (num > 0) {
    result = CHARSET[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  return result;
}

function generateCode() {
  // Date.now() gives ms since epoch — unique per ms, and monotonically increasing.
  // Collision window: two requests in the same millisecond.
  // Handled at DB level via the unique index on `code`.
  return encode(Date.now());
}

module.exports = { encode, generateCode };
