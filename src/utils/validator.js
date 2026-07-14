const PRIVATE_IP = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;
const MAX_URL_LENGTH = 2048;

function validateUrl(input) {
  if (!input || typeof input !== 'string') {
    return 'URL is required';
  }
  if (input.length > MAX_URL_LENGTH) {
    return `URL must be under ${MAX_URL_LENGTH} characters`;
  }

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return 'Invalid URL format';
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return 'URL must use http or https';
  }

  if (PRIVATE_IP.test(parsed.hostname)) {
    return 'URL must not point to a private or local address';
  }

  return null; // valid
}

module.exports = { validateUrl };
