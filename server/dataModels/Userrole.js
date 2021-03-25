module.exports = class Userrole {
  constructor(name, rights) {
    if (!name || typeof name !== 'string') throw new Error('Name for the Userrole must be defined and of type string');
    if (!rights || typeof rights !== 'object') throw new Error('Rights for the Userrole must be defined and of type object');
    this.name = name;
    this.rules = {};

    const allRights = this.constructor.getUserroleRights();

    allRights.forEach((right) => {
      const prop = rights[right.propertie];
      if (prop === undefined || typeof prop !== 'boolean') throw new Error(`${right.propertie} for the Userrole must be defined and of type boolean`);
      this.rules[right.propertie] = {
        description: right.description,
        allowed: prop,
      };
    });

    this.canEditUserrole = [];
  }

  static getUserroleRights() {
    return [
      {
        description: 'Can change Properties',
        propertie: 'canChangeProperties',
      },
      {
        description: 'Can View Advanced Data',
        propertie: 'canViewAdvancedData',
      },
      {
        description: 'Can create User',
        propertie: 'canCreateUser',
      },
      {
        description: 'Can delete User',
        propertie: 'canDeleteUser',
      },
    ];
  }
};
