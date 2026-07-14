const express = require('express');
const { shortenUrl, redirectToUrl } = require('../controllers/url.controller');

const router = express.Router();

router.post('/shorten', shortenUrl);
router.get('/:code', redirectToUrl);

module.exports = router;
