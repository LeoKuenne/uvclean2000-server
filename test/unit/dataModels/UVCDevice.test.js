const UVCDevice = require('../../../server/dataModels/UVCDevice');

describe('parseStates function', () => {
  it('Parses engingeState correctly', () => {
    expect(UVCDevice.parseStates('engineState', undefined, false)).toEqual({ value: false });
    expect(UVCDevice.parseStates('engineState', undefined, true)).toEqual({ value: true });
    expect(UVCDevice.parseStates('engineState', undefined, 'Test')).toEqual({ value: false });
  });

  it('Parses eventMode correctly', () => {
    expect(UVCDevice.parseStates('eventMode', undefined, false)).toEqual({ value: false });
    expect(UVCDevice.parseStates('eventMode', undefined, true)).toEqual({ value: true });
    expect(UVCDevice.parseStates('eventMode', undefined, 'Test')).toEqual({ value: false });
  });

  it('Parses currentBodyState correctly', () => {
    expect(UVCDevice.parseStates('currentBodyState', undefined, '1')).toEqual({ value: '1' });
    expect(UVCDevice.parseStates('currentBodyState', undefined, 10)).toEqual({ value: '10' });
    expect(UVCDevice.parseStates('currentBodyState', undefined, false)).toEqual({ value: 'false' });
  });

  it('Parses currentFanState correctly', () => {
    expect(UVCDevice.parseStates('currentFanState', undefined, '1')).toEqual({ value: '1' });
    expect(UVCDevice.parseStates('currentFanState', undefined, 10)).toEqual({ value: '10' });
    expect(UVCDevice.parseStates('currentFanState', undefined, false)).toEqual({ value: 'false' });
  });

  it('Parses tacho correctly', () => {
    expect(UVCDevice.parseStates('tacho', undefined, 1)).toEqual({ value: 1 });
    expect(UVCDevice.parseStates('tacho', undefined, 10)).toEqual({ value: 10 });
    expect(UVCDevice.parseStates('tacho', undefined, 'Test')).toEqual({ value: NaN });
  });

  it('Parses currentAirVolume correctly', () => {
    expect(UVCDevice.parseStates('currentAirVolume', undefined, 1)).toEqual({ value: 1 });
    expect(UVCDevice.parseStates('currentAirVolume', undefined, 10)).toEqual({ value: 10 });
    expect(UVCDevice.parseStates('currentAirVolume', undefined, 'Test')).toEqual({ value: NaN });
  });

  it('Parses engineLevel correctly', () => {
    expect(UVCDevice.parseStates('engineLevel', undefined, 1)).toEqual({ value: 1 });
    expect(UVCDevice.parseStates('engineLevel', undefined, 10)).toEqual({ value: 10 });
    expect(UVCDevice.parseStates('engineLevel', undefined, 'Test')).toEqual({ value: NaN });
  });

  it('Parses currentLampState correctly', () => {
    const d = UVCDevice.parseStates('currentLampState', '1', 'Ok');
    expect(d.lamp).toBe(1);
    expect(d.value).toBe('Ok');

    const d1 = UVCDevice.parseStates('currentLampState', 'True', false);
    expect(d1.lamp).toBe(NaN);
    expect(d1.value).toBe('false');
  });

  it('Parses currentLampValue correctly', () => {
    const d = UVCDevice.parseStates('currentLampValue', '1', '112.125125');
    expect(d.lamp).toBe(1);
    expect(d.value).toBe(112.125125);

    const d1 = UVCDevice.parseStates('currentLampValue', 'True', false);
    expect(d1.lamp).toBe(NaN);
    expect(d1.value).toBe(NaN);
  });
});

describe('checkAlarmState', () => {
  it.each([
    ['Alarm', true],
    ['Ok', false],
  ])('checks for currentLampState %s', (state, alarm) => {
    const device = {
      currentLampState: [{ state }],
      currentFanState: {
        state: 'Ok',
      },
      currentBodyState: {
        state: 'Ok',
      },
    };
    expect(UVCDevice.checkAlarmState(device)).toBe(alarm);
  });

  it.each([
    ['Alarm', true],
    ['Ok', false],
  ])('checks for currentFanState %s', (state, alarm) => {
    const device = {
      currentLampState: [{ state: 'Ok' }],
      currentFanState: {
        state,
      },
      currentBodyState: {
        state: 'Ok',
      },
    };
    expect(UVCDevice.checkAlarmState(device)).toBe(alarm);
  });

  it.each([
    ['Alarm', true],
    ['Ok', false],
  ])('checks for currentBodyState %s', (state, alarm) => {
    const device = {
      currentLampState: [{ state: 'Ok' }],
      currentFanState: {
        state: 'Ok',
      },
      currentBodyState: {
        state,
      },
    };
    expect(UVCDevice.checkAlarmState(device)).toBe(alarm);
  });

  it.each([
    ['Alarm', true],
    ['Ok', false],
  ])('checks for all states %s', (state, alarm) => {
    const device = {
      currentLampState: [{ state }],
      currentFanState: {
        state,
      },
      currentBodyState: {
        state,
      },
    };
    expect(UVCDevice.checkAlarmState(device)).toBe(alarm);
  });
});
