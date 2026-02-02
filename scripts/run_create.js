import { createCompletedStudents, verifyCreation } from './create_completed_students.js';

console.log('🚀 Starting completed student creation...');
createCompletedStudents().then(() => {
  console.log('✅ Creation completed, starting verification...');
  return verifyCreation();
}).then(() => {
  console.log('🎉 All operations completed!');
  console.log('\n📊 Your dashboards should now show the completed students!');
}).catch(error => {
  console.error('💥 Error:', error);
});
