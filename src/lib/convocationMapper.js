/**
 * CONVOCATION DATA MAPPER
 * Handles 9th Convocation CSV import and auto-fill logic
 */

/**
 * Parse convocation CSV and map to form fields
 * CSV Format: Registration No, Name, School, Admission Year, Status
 * @param {File} file - CSV file object
 * @returns {Promise<Array>} Parsed convocation data
 */
export async function parseConvocationCSV(file) {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  // Skip header row
  const data = lines.slice(1).map(line => {
    const [registration_no, student_name, school, admission_year, status] = line
      .split(',')
      .map(field => field.trim().replace(/^"|"$/g, '')); // Remove quotes
    
    return {
      registration_no: registration_no?.toUpperCase(),
      student_name,
      school,
      admission_year,
      status: status || 'not_started'
    };
  });
  
  return data;
}

/**
 * Auto-fill form from convocation data
 * @param {string} registrationNo - Student registration number
 * @param {object} supabase - Supabase client
 * @returns {Promise<object|null>} Pre-filled form data or null
 */
export async function getConvocationAutoFill(registrationNo, supabase) {
  if (!registrationNo) return null;
  
  try {
    const { data, error } = await supabase
      .from('convocation_eligible_students')
      .select('*')
      .eq('registration_no', registrationNo.toUpperCase())
      .single();
    
    if (error || !data) return null;
    
    // Return pre-filled data (make these fields read-only in UI)
    return {
      student_name: data.student_name,
      school: data.school,
      admission_year: data.admission_year,
      isConvocationStudent: true,
      convocationId: data.id
    };
  } catch (err) {
    console.error('Convocation auto-fill error:', err);
    return null;
  }
}

/**
 * Validate if student is eligible for no dues based on convocation list
 * @param {string} registrationNo - Student registration number
 * @param {Array} convocationData - Convocation eligible students array
 * @returns {boolean} True if eligible
 */
export function isConvocationEligible(registrationNo, convocationData) {
  if (!Array.isArray(convocationData)) return false;
  return convocationData.some(
    student => student.registration_no === registrationNo.toUpperCase()
  );
}

/**
 * Get convocation status badge color
 * @param {string} status - Convocation status
 * @returns {string} Tailwind color class
 */
export function getConvocationStatusColor(status) {
  const colors = {
    'not_started': 'gray',
    'in_progress': 'blue',
    'pending_approval': 'yellow',
    'completed': 'green',
    'rejected': 'red'
  };
  return colors[status] || 'gray';
}