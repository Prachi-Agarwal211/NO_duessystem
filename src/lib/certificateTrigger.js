// Certificate Generation Trigger Service
// This service handles automatic certificate generation when forms are completed

import { createClient } from '@supabase/supabase-js';
import { finalizeCertificate } from './certificateService';
import { sendCertificateReadyNotification } from './emailService';
import { APP_URLS, EMAIL_URLS } from './urlHelper';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Trigger certificate generation for a completed form
 * This function is called when a form status becomes 'completed'
 */
export async function triggerCertificateGeneration(formId, triggeredByUserId = null) {
  try {
    console.log(`🎯 Triggering certificate generation for form: ${formId}`);
    
    // 1. Verify form is completed and get form data
    const { data: form, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        status,
        personal_email,
        college_email,
        contact_no,
        course,
        branch,
        admission_year,
        passing_year,
        no_dues_status (
          department_name,
          status,
          action_at,
          action_by_user_id
        )
      `)
      .eq('id', formId)
      .single();

    if (formError) {
      console.error(`❌ Error fetching form ${formId}:`, formError);
      return { success: false, error: 'Form fetch failed' };
    }

    if (!form) {
      console.error(`❌ Form ${formId} not found`);
      return { success: false, error: 'Form not found' };
    }

    if (form.status !== 'completed') {
      console.warn(`⚠️ Form ${formId} is not completed (status: ${form.status})`);
      return { success: false, error: 'Form not completed' };
    }

    // 2. Verify all departments have approved
    const departments = form.no_dues_status || [];
    const approvedCount = departments.filter(d => d.status === 'approved').length;
    const totalCount = departments.length;

    if (approvedCount !== totalCount) {
      console.warn(`⚠️ Not all departments approved for form ${formId}: ${approvedCount}/${totalCount}`);
      return { success: false, error: 'Not all departments approved' };
    }

    // 3. Check if certificate already exists
    if (form.final_certificate_generated && form.certificate_url) {
      console.log(`✅ Certificate already exists for form ${formId}: ${form.certificate_url}`);
      return { success: true, alreadyGenerated: true, certificateUrl: form.certificate_url };
    }

    // 4. Generate certificate
    console.log(`📝 Generating certificate for form ${formId}...`);
    
    const certificateResult = await finalizeCertificate(formId);
    
    if (!certificateResult || !certificateResult.success) {
      console.error(`❌ Certificate generation failed for form ${formId}:`, certificateResult);
      return { success: false, error: 'Certificate generation failed' };
    }

    console.log(`✅ Certificate generated successfully for form ${formId}: ${certificateResult.certificateUrl}`);

    // 5. Send notifications
    const studentEmail = form.personal_email || form.college_email;
    
    if (studentEmail) {
      try {
        console.log(`📧 Sending certificate ready email to ${studentEmail}...`);
        
        const emailResult = await sendCertificateReadyNotification({
          studentEmail,
          studentName: form.student_name,
          registrationNo: form.registration_no,
          certificateUrl: EMAIL_URLS.studentCheckStatus(form.registration_no)
        });

        if (emailResult.success) {
          console.log(`✅ Certificate email sent to ${studentEmail}`);
        } else {
          console.warn(`⚠️ Certificate email failed for ${studentEmail}:`, emailResult.error);
        }
      } catch (emailError) {
        console.error(`❌ Email notification error:`, emailError);
      }
    }

    // 6. Log the certificate generation
    console.log(`🎉 Certificate generation completed for form ${formId}`);
    
    return {
      success: true,
      certificateUrl: certificateResult.certificateUrl,
      formId: formId,
      studentName: form.student_name,
      registrationNo: form.registration_no
    };

  } catch (error) {
    console.error(`❌ Fatal error in certificate trigger for form ${formId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Check and generate certificates for all completed forms
 * This is a utility function for batch processing or manual fixes
 */
export async function processAllCompletedForms() {
  try {
    console.log('🔍 Checking for completed forms that need certificates...');

    // Get all completed forms that don't have certificates
    const { data: forms, error: formsError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        registration_no,
        student_name,
        status,
        final_certificate_generated,
        certificate_url
      `)
      .eq('status', 'completed')
      .or('final_certificate_generated.is.false,final_certificate_generated.is.null')
      .limit(50); // Process in batches

    if (formsError) {
      console.error('❌ Error fetching completed forms:', formsError);
      return { success: false, error: 'Database query failed' };
    }

    if (!forms || forms.length === 0) {
      console.log('✅ No completed forms need certificates');
      return { success: true, processed: 0 };
    }

    console.log(`📋 Found ${forms.length} completed forms without certificates`);

    let processed = 0;
    let failed = 0;

    for (const form of forms) {
      console.log(`\n🔄 Processing form ${form.registration_no} (${form.student_name})...`);
      
      const result = await triggerCertificateGeneration(form.id);
      
      if (result.success) {
        processed++;
        console.log(`✅ Processed: ${form.registration_no} - ${result.certificateUrl}`);
      } else {
        failed++;
        console.error(`❌ Failed: ${form.registration_no} - ${result.error}`);
      }
    }

    console.log(`\n📊 Processing complete: ${processed} succeeded, ${failed} failed`);
    
    return {
      success: true,
      processed,
      failed,
      total: forms.length
    };

  } catch (error) {
    console.error('❌ Error in batch processing:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Manual certificate generation for debugging
 */
export async function manualCertificateGeneration(formId) {
  console.log(`🔧 Manual certificate generation for form: ${formId}`);
  
  const result = await triggerCertificateGeneration(formId);
  
  if (result.success) {
    console.log(`🎉 Manual generation successful: ${result.certificateUrl}`);
  } else {
    console.error(`💥 Manual generation failed: ${result.error}`);
  }
  
  return result;
}
