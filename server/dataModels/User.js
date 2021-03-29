module.exports = class User {
  constructor(username, password, userrole) {
    this.constructor.verifyUsername(username);
    this.username = username;

    this.constructor.verifyPassword(password);
    this.password = password;

    if (!userrole && typeof userrole !== 'string') throw new Error('Userrole has to be defined and of type string');
    this.userrole = userrole;
  }

  static verifyUsername(username) {
    if (username.length <= 3 || username.match(/[^0-9A-Za-z+ ]/gm) !== null) {
      throw new Error(`Username has to be vaild. Word length has to be at least 3. Only letters and numbers are allowed.\n Invalid characters: ${username.match(/[^a-zA-z0-9 ]/gm).join(',')}`);
    }
    return true;
  }

  static verifyPassword(password) {
    if (password.length <= 5 || password.match(/[^0-9A-Za-z+#-.!&]/gm) !== null) {
      throw new Error(`Password has to be vaild. Password length has to be at least 5. Only letters and numbers are allowed.\n Invalid characters: ${password.match(/[^0-9A-Za-z+#-.!&]/gm).join(',')}`);
    }
    return true;
  }
};
