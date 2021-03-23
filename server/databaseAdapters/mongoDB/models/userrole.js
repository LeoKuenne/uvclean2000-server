const mongoose = require('mongoose');

const userrole = new mongoose.Schema({
  name: { type: String, required: true },
  canChangeProperties: { type: Boolean, default: false },
  canViewAdvancedData: { type: Boolean, default: false },
  canEditUserrole: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Userrole' }],
});

const UserroleModel = mongoose.model('Userrole', userrole);

module.exports = UserroleModel;
