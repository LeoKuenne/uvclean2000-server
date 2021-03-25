const mongoose = require('mongoose');
const Userrole = require('../../../dataModels/Userrole');

const allRights = Userrole.getUserroleRights();

const userroleObject = {
  name: { type: String, required: true },
  canEditUserrole: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Userrole' }],
};

allRights.forEach((right) => {
  userroleObject[right.propertie] = { type: Boolean, default: false };
});

const userrole = new mongoose.Schema(userroleObject);

const UserroleModel = mongoose.model('Userrole', userrole);

module.exports = UserroleModel;
