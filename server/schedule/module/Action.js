module.exports = class Action {
  constructor(group, propertie, newValue) {
    this.group = group;
    this.propertie = propertie;
    this.newValue = newValue;
  }
};
