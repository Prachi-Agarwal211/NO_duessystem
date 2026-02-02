import { createCompletedStudents, verifyCreation } from './create_completed_simple.js';

console.log('🚀 Starting completed student creation (no alumni requirement)...');
createCompletedStudents().then(() => {
  console.log('✅ Creation completed, starting verification...');
  return verifyCreation();
}).then(() => {
  console.log('🎉 All operations completed!');
  console.log('\n📊 Your dashboards should now show all 242 completed students with certificates!');
}).catch(error => {
  console.error('💥 Error:', error);
});
