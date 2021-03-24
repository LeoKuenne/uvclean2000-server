module.exports = class Userrole {
  constructor(name, canChangeProperties, canViewAdvancedData) {
    if (!name || typeof name !== 'string') throw new Error('Name for the Userrole must be defined and of type string');
    this.name = name;

    if (canChangeProperties === undefined || typeof canChangeProperties !== 'boolean') throw new Error('CanChangeProperties for the Userrole must be defined and of type boolean');
    this.canChangeProperties = canChangeProperties;

    if (canViewAdvancedData === undefined || typeof canViewAdvancedData !== 'boolean') throw new Error('CanViewAdvancedData for the Userrole must be defined and of type boolean');
    this.canViewAdvancedData = canViewAdvancedData;

    this.canEditUserrole = [];
  }
};
