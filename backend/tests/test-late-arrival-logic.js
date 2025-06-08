const { checkLateArrival } = require('../src/utils/workSettings');

// テストケース
const testCases = [
  {
    description: "10:00 start time, clock in at 09:30 (should not be late)",
    clockInTime: new Date('2024-01-01T09:30:00'),
    workSettings: { workStartTime: '10:00', settingSource: 'test' }
  },
  {
    description: "10:00 start time, clock in at 10:00 (should not be late)",
    clockInTime: new Date('2024-01-01T10:00:00'),
    workSettings: { workStartTime: '10:00', settingSource: 'test' }
  },
  {
    description: "10:00 start time, clock in at 10:01 (should be late)",
    clockInTime: new Date('2024-01-01T10:01:00'),
    workSettings: { workStartTime: '10:00', settingSource: 'test' }
  },
  {
    description: "10:00 start time, clock in at 10:30 (should be late)",
    clockInTime: new Date('2024-01-01T10:30:00'),
    workSettings: { workStartTime: '10:00', settingSource: 'test' }
  },
  {
    description: "09:00 start time, clock in at 09:30 (should be late)",
    clockInTime: new Date('2024-01-01T09:30:00'),
    workSettings: { workStartTime: '09:00', settingSource: 'test' }
  },
  {
    description: "09:00 start time, clock in at 08:59 (should not be late)",
    clockInTime: new Date('2024-01-01T08:59:00'),
    workSettings: { workStartTime: '09:00', settingSource: 'test' }
  }
];

console.log('🧪 Testing late arrival calculation...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`);
  
  const clockInTimeStr = testCase.clockInTime.toTimeString().slice(0, 5);
  console.log(`  Clock in time string: "${clockInTimeStr}"`);
  console.log(`  Expected start time: "${testCase.workSettings.workStartTime}"`);
  console.log(`  String comparison (${clockInTimeStr} > ${testCase.workSettings.workStartTime}): ${clockInTimeStr > testCase.workSettings.workStartTime}`);
  
  const result = checkLateArrival(testCase.clockInTime, testCase.workSettings);
  console.log(`  Result:`, result);
  console.log('');
});
