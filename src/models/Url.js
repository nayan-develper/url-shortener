const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalUrl: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isAlias: {
      type: Boolean,
      default: false,
    },
    clicks: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Url', urlSchema);
