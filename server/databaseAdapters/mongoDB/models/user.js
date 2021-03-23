const mongoose = require('mongoose');

const user = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  userrole: { type: mongoose.Schema.Types.ObjectId, ref: 'Userrole' },
});

const userModel = mongoose.model('User', user);

module.exports = userModel;
