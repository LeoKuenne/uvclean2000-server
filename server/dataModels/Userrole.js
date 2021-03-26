module.exports = class Userrole {
  /**
   * Creates a valid Userrole class with name, the rights and the userroles that can be edited
   * @param {String} name Name of the userrole
   * @param {Object} rights Object with the rights as keys and the state as boolean
   * @param {Array} canBeEditedByUserrole Array of Userrolenames that can be edited
   */
  constructor(name, rights = {}, canBeEditedByUserrole = []) {
    if (!name || typeof name !== 'string') throw new Error('Name for the Userrole must be defined and of type string');
    if (!rights || typeof rights !== 'object') throw new Error('Rights for the Userrole must be defined and of type object');
    if (!canBeEditedByUserrole || !Array.isArray(canBeEditedByUserrole)) throw new Error('canBeEditedByUserrole for the Userrole must be defined and of type array');

    this.name = name;
    this.rules = {};

    const allRights = this.constructor.getUserroleRights();

    allRights.forEach((right) => {
      const prop = rights[right.propertie];
      if (prop !== undefined && typeof prop !== 'boolean') throw new Error(`${right.propertie} for the Userrole must be defined and of type boolean`);
      this.rules[right.propertie] = {
        description: right.description,
        allowed: (prop !== undefined) ? prop : false,
      };
    });

    this.canBeEditedByUserrole = canBeEditedByUserrole;
  }

  static getUserroleRights() {
    return [
      {
        description: 'Can change Properties',
        propertie: 'canChangeProperties',
      },
      {
        description: 'Can view advanced Data',
        propertie: 'canViewAdvancedData',
      },
      {
        description: 'Can edit Userroles',
        propertie: 'canEditUserrole',
      },
    ];
  }
};
