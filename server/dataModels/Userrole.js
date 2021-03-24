module.exports = class Userrole {
  constructor(name, canChangeProperties, canViewAdvancedData) {
    if (!name || typeof name !== 'string') throw new Error('Name for the Userrole must be defined and of type string');
    this.name = name;

    if (canChangeProperties === undefined || typeof canChangeProperties !== 'boolean') throw new Error('CanChangeProperties for the Userrole must be defined and of type boolean');
    if (canViewAdvancedData === undefined || typeof canViewAdvancedData !== 'boolean') throw new Error('CanViewAdvancedData for the Userrole must be defined and of type boolean');

    this.rules = {
      canChangeProperties: {
        describtion: 'Can change Properties',
        allowed: canChangeProperties,
      },
      canViewAdvancedData: {
        describtion: 'Can View Advanced Data',
        allowed: canViewAdvancedData,
      },
    };

    this.canEditUserrole = [];
  }
};
