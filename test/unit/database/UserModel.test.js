const mongoose = require('mongoose');
const UserModel = require('../../../server/databaseAdapters/mongoDB/models/user');

const user = {
  username: 'Username 1',
  password: 'Test!',
  canEdit: true,
};

describe('User Model Test', () => {
  beforeAll(async () => {
    await mongoose.connect(`${global.__MONGO_URI__}`,
      {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
      }, (err) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
      });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('create & save user successfully', async () => {
    const validUser = new UserModel(user);
    const savedUser = await validUser.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.username).toBe(user.username);
    expect(savedUser.password).toBe(user.password);
    expect(savedUser.userrole).toBe(user.userrole);
  });

  it('insert user successfully, but the field not defined in schema should be undefined', async () => {
    user.undefinedField = '';
    const userWithInvalidField = new UserModel(user);
    const savedUserWithInvalidField = await userWithInvalidField.save();
    expect(savedUserWithInvalidField._id).toBeDefined();
    expect(savedUserWithInvalidField.undefinedField).toBeUndefined();
  });

  it('create user without required field should failed', async () => {
    const userWithoutRequiredField = new UserModel({ canEdit: '3' });
    let err;
    try {
      const savedUserWithoutRequiredField = await userWithoutRequiredField.save();
      error = savedUserWithoutRequiredField;
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.username).toBeDefined();
  });
});
