module.exports = class Userrole {
  constructor(name, canChangeProperties, canViewAdvancedData) {
    this.name = name;
    this.canChangeProperties = canChangeProperties;
    this.canViewAdvancedData = canViewAdvancedData;
    this.canEditUserrole = [];
  }
};
