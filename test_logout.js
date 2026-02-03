// Simple test script to verify logout functionality
// This can be run in the browser console to test the fix

console.log('🧪 Testing logout functionality...');

// Test 1: Check if AuthContext is available
try {
  const { useAuth } = require('@/contexts/AuthContext');
  console.log('✅ AuthContext is available');
} catch (error) {
  console.log('❌ AuthContext not available:', error.message);
}

// Test 2: Check if department page uses AuthContext
fetch('/department')
  .then(response => response.text())
  .then(html => {
    if (html.includes('useAuth')) {
      console.log('✅ Department page uses AuthContext');
    } else {
      console.log('❌ Department page does not use AuthContext');
    }
  })
  .catch(error => {
    console.log('❌ Error checking department page:', error.message);
  });

console.log('🔍 Manual test steps:');
console.log('1. Login as department staff');
console.log('2. Navigate to department dashboard');
console.log('3. Click logout button');
console.log('4. Verify you are redirected to /staff/login');
console.log('5. Try to access /department directly - should redirect to login');
