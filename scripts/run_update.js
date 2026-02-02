import { updateCompletedStudents, verifyUpdates } from './update_completed_students_fixed.js';

console.log('🚀 Starting student status update...');
updateCompletedStudents().then(() => {
  console.log('✅ Update completed, starting verification...');
  return verifyUpdates();
}).then(() => {
  console.log('🎉 All operations completed!');
}).catch(error => {
  console.error('💥 Error:', error);
});
