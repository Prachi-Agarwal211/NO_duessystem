import { forceCompleteStudents, verifyForceCompletion } from './force_complete_students.js';

console.log('🚀 STARTING FORCE COMPLETION...');
console.log('🔓 This will bypass ALL alumni requirements!');
console.log('📜 All 242 students will be marked as completed with certificates!\n');

forceCompleteStudents().then(() => {
  console.log('\n✅ Force completion done, starting verification...');
  return verifyForceCompletion();
}).then(() => {
  console.log('\n🎉 ALL OPERATIONS COMPLETED!');
  console.log('📊 Your dashboards now show all completed students!');
  console.log('🔓 Alumni requirement successfully bypassed!');
}).catch(error => {
  console.error('💥 Error:', error);
});
