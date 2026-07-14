const Url = require('../models/Url');
const { generateCode } = require('../services/shortener');
const { validateUrl } = require('../utils/validator');

async function shortenUrl(req, res) {
  const { url, alias } = req.body;

  const error = validateUrl(url);
  if (error) {
    return res.status(422).json({ error });
  }

  // Custom alias flow
  if (alias) {
    const exists = await Url.findOne({ code: alias });
    if (exists) {
      return res.status(409).json({ error: 'Alias already taken' });
    }
    const entry = await Url.create({ code: alias, originalUrl: url, isAlias: true });
    return res.status(201).json(buildResponse(entry, req));
  }

  // Duplicate URL — return existing code (idempotent)
  const existing = await Url.findOne({ originalUrl: url });
  if (existing) {
    return res.status(200).json({ ...buildResponse(existing, req), new: false });
  }

  // New URL — generate base62 code
  const code = generateCode();
  const entry = await Url.create({ code, originalUrl: url });
  return res.status(201).json({ ...buildResponse(entry, req), new: true });
}

async function redirectToUrl(req, res) {
  const { code } = req.params;
  const entry = await Url.findOneAndUpdate(
    { code },
    { $inc: { clicks: 1 } },
    { new: true }
  );

  if (!entry) {
    return res.status(404).json({ error: 'Short code not found' });
  }

  return res.redirect(301, entry.originalUrl);
}

function buildResponse(entry, req) {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return {
    shortCode: entry.code,
    shortUrl: `${base}/${entry.code}`,
    originalUrl: entry.originalUrl,
  };
}

module.exports = { shortenUrl, redirectToUrl };
