const { checkLateArrival } = require('../src/utils/workSettings');

describe('Late Arrival Basic Test', () => {
  test('should work with basic calculation', () => {
    const clockInTime = new Date('2024-01-01T10:01:00');
    const workSettings = { 
      workStartTime: '10:00', 
      settingSource: 'test',
      projectName: null
    };

    const result = checkLateArrival(clockInTime, workSettings);

    expect(result.isLate).toBe(true);
    expect(result.lateMinutes).toBe(1);
  });

  test('should handle 10:00 start time with 10:00 clock in', () => {
    const clockInTime = new Date('2024-01-01T10:00:00');
    const workSettings = { 
      workStartTime: '10:00', 
      settingSource: 'test',
      projectName: null
    };

    const result = checkLateArrival(clockInTime, workSettings);
    
    
    expect(result.isLate).toBe(false);
    expect(result.lateMinutes).toBe(0);
  });
});
