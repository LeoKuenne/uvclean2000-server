module.exports = class User {
  constructor(username, password, userrole) {
    if (username.length <= 3 || username.match(/[^0-9A-Za-z+ ]/gm) !== null) {
      throw new Error(`Username has to be vaild. Only letters and numbers are allowed.\n Invalid characters: ${username.match(/[^a-zA-z0-9 ]/gm).join(',')}`);
    }
    this.username = username;

    if (password.length <= 5 || password.match(/[^0-9A-Za-z+#-.!&]/gm) !== null) {
      throw new Error(`Password has to be vaild. Only letters and numbers are allowed.\n Invalid characters: ${username.match(/[^0-9A-Za-z+#-.!&]/gm).join(',')}`);
    }
    this.password = password;

    if (!userrole && typeof userrole !== 'string') throw new Error('Userrole has to be defined and of type string');
    this.userrole = userrole;
  }
};
