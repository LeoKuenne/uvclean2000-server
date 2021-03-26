module.exports = class AuthenticationError extends Error {
  constructor(username, message) {
    super(message);
    this.username = username;
  }
};
