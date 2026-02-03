/**
 * Delete forms by registration number
 * Usage: node scripts/delete_forms.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FORMS_TO_DELETE = ['22BCOM1367', '21BCON532'];

async function deleteForms() {
  console.log('🗑️ Starting form deletion...\n');

  for (const regNo of FORMS_TO_DELETE) {
    console.log(`Processing: ${regNo}`);

    // Find the form
    const { data: form, error: findError } = await supabase
      .from('no_dues_forms')
      .select('id')
      .eq('registration_no', regNo.toUpperCase())
      .single();

    if (findError || !form) {
      console.log(`  ❌ Form not found: ${regNo}`);
      continue;
    }

    const formId = form.id;
    console.log(`  📋 Found form ID: ${formId}`);

    // Delete related records from no_dues_status
    const { error: statusError } = await supabase
      .from('no_dues_status')
      .delete()
      .eq('form_id', formId);

    if (statusError) {
      console.log(`  ⚠️ Error deleting status records: ${statusError.message}`);
    } else {
      console.log(`  ✅ Deleted status records`);
    }

    // Delete related records from no_dues_messages
    const { error: messagesError } = await supabase
      .from('no_dues_messages')
      .delete()
      .eq('form_id', formId);

    if (messagesError) {
      console.log(`  ⚠️ Error deleting messages: ${messagesError.message}`);
    } else {
      console.log(`  ✅ Deleted message records`);
    }

    // Delete related records from no_dues_reapplication_history
    const { error: historyError } = await supabase
      .from('no_dues_reapplication_history')
      .delete()
      .eq('form_id', formId);

    if (historyError) {
      console.log(`  ⚠️ Error deleting history: ${historyError.message}`);
    } else {
      console.log(`  ✅ Deleted history records`);
    }

    // Delete the form itself
    const { error: formError } = await supabase
      .from('no_dues_forms')
      .delete()
      .eq('id', formId);

    if (formError) {
      console.log(`  ❌ Error deleting form: ${formError.message}`);
    } else {
      console.log(`  ✅ Deleted form: ${regNo}`);
    }

    console.log('');
  }

  console.log('🎉 Deletion complete!');
}

deleteForms().catch(console.error);
