const mongoose = require('mongoose');

const settings = new mongoose.Schema({
  name: { type: String, required: true },
  defaultEngineLevel: { type: Number },
});

const SettingsModel = mongoose.model('Settings', settings);

module.exports = SettingsModel;
