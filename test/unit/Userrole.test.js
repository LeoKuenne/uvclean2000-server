const Userrole = require('../../server/dataModels/Userrole');

it('Creates an userrole', () => {
  const userrole = new Userrole('Name', true, true);
  expect(userrole.name).toMatch('Name');
  expect(userrole.canChangeProperties).toBe(true);
  expect(userrole.canViewAdvancedData).toBe(true);
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

it('Throws an error if CanChangeProperties is not defined and not a string', () => {
  try {
    new Userrole('Name');
  } catch (error) {
    expect(error.message).toMatch('CanChangeProperties for the Userrole must be defined and of type boolean');
  }
  try {
    new Userrole('Name', 'true');
  } catch (error) {
    expect(error.message).toMatch('CanChangeProperties for the Userrole must be defined and of type boolean');
  }
});

it('Throws an error if CanViewAdvancedData is not defined and not a string', () => {
  try {
    new Userrole('Name', true);
  } catch (error) {
    expect(error.message).toMatch('CanViewAdvancedData for the Userrole must be defined and of type boolean');
  }
  try {
    new Userrole('Name', true, 'true');
  } catch (error) {
    expect(error.message).toMatch('CanViewAdvancedData for the Userrole must be defined and of type boolean');
  }
});
