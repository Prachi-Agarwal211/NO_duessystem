/**
 * Standardized Rejection Reasons
 * Used by staff when rejecting student no-dues applications
 */

export const REJECTION_REASONS = [
    {
        code: 'DUES_PENDING',
        label: 'Outstanding dues/fines',
        description: 'Student has pending financial dues or fines'
    },
    {
        code: 'BOOK_NOT_RETURNED',
        label: 'Library book not returned',
        description: 'One or more library books have not been returned'
    },
    {
        code: 'ID_NOT_RETURNED',
        label: 'ID card not returned',
        description: 'Student ID card has not been returned'
    },
    {
        code: 'KEY_NOT_RETURNED',
        label: 'Room/locker key not returned',
        description: 'Hostel room key or locker key not returned'
    },
    {
        code: 'EQUIPMENT_NOT_RETURNED',
        label: 'Equipment not returned',
        description: 'Lab equipment or other items not returned'
    },
    {
        code: 'DOCUMENT_MISSING',
        label: 'Missing required document',
        description: 'Required document not submitted or missing'
    },
    {
        code: 'VERIFICATION_FAILED',
        label: 'Verification failed',
        description: 'Could not verify student records or identity'
    },
    {
        code: 'DATA_INCORRECT',
        label: 'Incorrect information',
        description: 'Information provided in the form is incorrect'
    },
    {
        code: 'CUSTOM',
        label: 'Other (specify below)',
        description: 'Custom rejection reason'
    }
];

/**
 * Get rejection reason label by code
 */
export function getRejectionReasonLabel(code) {
    const reason = REJECTION_REASONS.find(r => r.code === code);
    return reason ? reason.label : code;
}

/**
 * Default rejection reasons for specific departments
 */
export const DEPARTMENT_DEFAULT_REASONS = {
    library: ['BOOK_NOT_RETURNED', 'DUES_PENDING'],
    hostel: ['KEY_NOT_RETURNED', 'DUES_PENDING'],
    it_department: ['EQUIPMENT_NOT_RETURNED', 'ID_NOT_RETURNED'],
    accounts_department: ['DUES_PENDING'],
    school_hod: ['VERIFICATION_FAILED', 'DOCUMENT_MISSING'],
    registrar: ['DOCUMENT_MISSING', 'DATA_INCORRECT', 'VERIFICATION_FAILED'],
    alumni_association: ['DUES_PENDING', 'VERIFICATION_FAILED']
};
