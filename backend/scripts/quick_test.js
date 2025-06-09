// Very simple timezone test
console.log('=== タイムゾーンテスト開始 ===');

// Test 1: UTC to JST conversion
const utcTime = new Date('2024-01-15T01:00:00.000Z'); // UTC 01:00
const jstTime = new Date(utcTime.getTime() + (9 * 60 * 60 * 1000)); // Add 9 hours
const jstTimeStr = jstTime.toISOString().slice(11, 16); // Get HH:MM

console.log(`UTC時刻: ${utcTime.toISOString()}`);
console.log(`JST時刻: ${jstTimeStr}`);
console.log(`開始時刻: 09:00`);
console.log(`遅刻判定: ${jstTimeStr > '09:00' ? '遅刻' : '正常'}`);

// Test 2: JST to UTC conversion for saving
const jstInput = '10:00';
const dateString = '2024-01-15';
const jstDateTime = new Date(`${dateString}T${jstInput}:00+09:00`);
console.log(`\nJST入力: ${jstInput}`);
console.log(`UTC保存: ${jstDateTime.toISOString()}`);

console.log('\n✅ テスト完了');
