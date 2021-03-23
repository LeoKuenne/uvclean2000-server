const fs = require('fs');
const fernet = require('fernet');
const decrypt = require('../../../server/events/MQTTEvents/middleware/decrypt');

describe('Decrypt message', () => {
  it.each([
    ['gAAAAABgSPLwdjMeSqhgM5ussYi3ipUZ1tBDNSwjTbPhVDMx0XAhqL0EwQ8V3oSJ77cx5j-sCQcXTZpjA2D2zaXoh60M7Vwadw==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSPh8WM8MIMGBG51ulubuQUlz9mSpdLsB7tDqk6GGfGgeTQkbPWaqHj6yG_aYeBCWCnLTl9eIam4y2RC4erWy3GY32w==', 'false', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgPDFSYPj2eNlD38nCjDJHOl1AfNmYKrcoc4Z61t-PJYAnAU23kOpRKljEhjJ1y34LSRjeeBAKRW7o6gDDU_p0wUJ9Xw==', '33', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSdx3tL98l4B6kR4hJQBxGuUa9eTgmSY7K1sNBOCLCI260QCksUBXrz8pVb275P49CCQ6l7GGP-cFGEGOJePlQ7w3-g==', 'false', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSfT5_toEhNXK_MKOwnF23258cclSpcOG6N07lGpPlnaJ-KNHfOfTt53VEK6trFww45xt9ffdIxLCLzS0ox_Qsl6P6ALrWdGJQyDEn9jX2uCIgXQ=', '207.54529853716465', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgstYd9-u9Lmb75ZlkfjcL515pHQVn4A4srAr8bMD8hbd820SmpXJxT4V2DRbq2Uzd4tymLRXF_r8nQKtdgoD2BCOA==', '2', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgswwmYZ0NnL4AO91ImYM0sxjPL6i0KvyfAZ6c0aXEXA6JnNpjLJzANJW8Y2zp2AAh3G0o3SR2ltgI_FiTHlLFAsRQ==', '1', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtIoaWqXIbnWOKD7dgD0ICl_WO4Au3U8jDqoA_DykNxrPgqeRX_wC8r0s_HiOu9xJq7kvrxGX9aLT6YZKTcEd9caQ==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtJUd0PS4dn819WcEMNCtR4PrPqAWfTlZzTGbpmPpHUzjK-4X9uls0SHOy_4LQCjbe13j5NBe0y7FkTNTWf_E0adQ==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtKP22Csd5L210PZU7BbnvEEJT7kkUmxs07wycxRDl6PmSkReXxVarphgnQijvJhCRHO2Ixd2tqSW-7yy18I1Rvuw==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtKjNb6atEveo73Jvg5TUeOVH4l53mLfcpsL8aqYdaG-6a1BsQ0nde2VxytlXxlCTbQJWyoODUVxb2jT-NuH65T4A==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtKBdh0BanzrMkP35pBF1rls9KwfuNKtytN_HcXD6K89muQ9uzruy8oa1YQigXqnr5kPZThp5Vr3icHGEeKBzspCw==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtLhi4Uk_QP3Omoov4FBBn8Xc4hWP4qXdrZpj_VWtctTKlRO5Ro5Yfr7koC_iInJSHKTaTt1TdCVe7hNkRV1rzCdA==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtLsJ1lEmnCOr0jNZaVxA33XwC2yAqksbt1ZdR7y4vUA9mlLrw0QpUTm3FY8Ei64B9U76D06Jkh_Cs3jmD0a5CvXQ==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtLgDxMCihEFlzQs9LAW9In9bbF3cu6n1_3yT4IZ3XETYqCWo9k5PKg53buoUUjtiMisjAxDrbU7s07FL4EyLa5hQ==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtLyYbCRyV_7LiB_QYq0TQd9L8fKHaWEtvD1Z30c4s_8o7b8xO3XNKDY9W59Xu9q4l5U8oUAY2IlOCBW8VxMrgaGA==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtLretu6rkzfoZUgTbEwjb_wcFOokMGl7Ab39L4tUt1lzwdC2DiucQXOdIivRcSeRYvlRZrANL6a_neP61nlB8UcA==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtMSdYODVbx-O_jlVJb1egSFFbSm3zvVq2kqK_tlfkvoSzkyWed7hKN9eQjIVTNdeGIyQr_ptNtYweSce9NF9vhzA==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtMVVaKm2JWSlbjEtVSr-HTwvfHB0VQIogXiMm1eEWMtxWu5ZVojwSEN7JjVU2n6XTfgd-iK6GV7Kl2TSStE3GVNw==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtMHTXov1KqWIlvzkIb166xdrOoL8o7_BRF5Z9CUHz6iaNe9RgfOs3zlsJZ4iQT3eXp5OxR0jMDzgljb7GsZtSLiw==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgtMN4aMA-GtRhtj46zCxw9wb5sVNRE6R_Y91fhiihLkzdq2ABsKO7xI0imuDeIt4u-HcEqGjzNrX4weRPLp1GwH3w==', 'true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['gAAAAABgSgti3x8MGXIL9HtTbpbLlXS6JfDBN7I7qJUlJH98spRVfXBsZxLdwGStehjSd_BvNrwlOMf6UTo1XPtv5oaeDmaY7g==', 'false', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
  ])('Decryptes %s to %s without ttl accordingly', async (message, payload, secret, done) => {
    global.config = { mqtt: { secret: 'C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret', useTTL: false, ttl: 1 } };
    fs.writeFileSync('C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret', secret, { encoding: 'base64' });
    // eslint-disable-next-line prefer-const
    let msg = { message };

    await decrypt.decrypt(null, null, null, null, msg, () => {});

    expect(msg.message).toMatch(payload);
    done();
  });

  it.each([
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['false', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['33', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['false', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['207.54529853716465', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['2', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['1', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['false', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
  ])('Decryptes %s with ttl accordingly', async (message, secret, done) => {
    global.config = { mqtt: { secret: 'C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret', useTTL: true, ttl: 1 } };
    fs.writeFileSync('C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret', secret, { encoding: 'base64' });
    // eslint-disable-next-line prefer-const

    const fernetSecret = fernet.setSecret(secret);
    const token = new fernet.Token({
      fernetSecret,
    });

    const msg = { message: await token.encode(message) };

    await decrypt.decrypt(null, null, null, null, msg, () => {});

    expect(msg.message).toMatch(message);
    done();
  });

  it.each([
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['false', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['33', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['false', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['207.54529853716465', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['2', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['1', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
    ['true', 'NQCNtEul3sEuOwMSRExMeh_RQ0iYD0USEemo00G4pCg='],
  ])('Decryptes %s with ttl and fails if ttl is expired by 100ms', async (message, secret, done) => {
    global.config = { mqtt: { secret: 'C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret', useTTL: true, ttl: 1 } };
    fs.writeFileSync('C:/workspace_nodejs/uvclean2000-server/server/ssl/fernetSecret', secret, { encoding: 'base64' });
    // eslint-disable-next-line prefer-const

    const fernetSecret = fernet.setSecret(secret);
    const token = new fernet.Token({
      fernetSecret,
      time: new Date(Date.now() - 1100),
    });

    const msg = { message: await token.encode(message) };

    try {
      await decrypt.decrypt(null, null, null, null, msg, () => {});
      done(new Error('Decrypt did not throw!'));
    } catch (error) {
      try {
        expect(error.message).toMatch('Invalid Token: TTL');
        done();
      } catch (e) {
        done(e);
      }
    }
  });
});
