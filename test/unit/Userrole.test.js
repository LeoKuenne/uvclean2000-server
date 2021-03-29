/* eslint-disable no-new */
const Userrole = require('../../server/dataModels/Userrole');

it('Creates an userrole', () => {
  const allRights = Userrole.getUserroleRights();
  const rightsObject = {};
  allRights.forEach((right) => {
    rightsObject[right.propertie] = true;
  });
  const userrole = new Userrole('Name', rightsObject);
  expect(userrole.name).toMatch('Name');

  allRights.forEach((right) => {
    expect(userrole.rules[right.propertie].allowed).toBe(true);
    expect(userrole.rules[right.propertie].description).toMatch(right.description);
  });
});

it('Throws an error if name is not defined and not a string', () => {
  try {
    new Userrole();
  } catch (error) {
    expect(error.message).toMatch('Name for the Userrole must be defined and of type string');
  }
  try {
    new Userrole(true);
  } catch (error) {
    expect(error.message).toMatch('Name for the Userrole must be defined and of type string');
  }
});

it('Throws an error if rights is not defined', () => {
  try {
    new Userrole('Name');
  } catch (error) {
    expect(error.message).toMatch('Rights for the Userrole must be defined and of type object');
  }
});

it('Throws an error if canChangeProperties is not defined and not a string', () => {
  try {
    new Userrole('Name', { });
  } catch (error) {
    expect(error.message).toMatch('canChangeProperties for the Userrole must be defined and of type boolean');
  }
  try {
    new Userrole('Name', { canChangeProperties: 'true' });
  } catch (error) {
    expect(error.message).toMatch('canChangeProperties for the Userrole must be defined and of type boolean');
  }
});
