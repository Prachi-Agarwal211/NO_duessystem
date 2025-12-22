// Email Notification Mode Helper
// Checks admin settings to determine if emails should be sent immediately or in daily digest

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get the current email notification mode from settings
 * @returns {Promise<string>} 'immediate' or 'daily_digest'
 */
export async function getEmailNotificationMode() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'email_notification_mode')
      .single();

    if (error || !data) {
      // Default to immediate if no setting found
      return 'immediate';
    }

    return data.value || 'immediate';
  } catch (error) {
    console.error('Error fetching email notification mode:', error);
    // Default to immediate on error
    return 'immediate';
  }
}

/**
 * Check if immediate emails should be sent
 * @returns {Promise<boolean>}
 */
export async function shouldSendImmediateEmail() {
  const mode = await getEmailNotificationMode();
  return mode === 'immediate';
}

/**
 * Check if daily digest mode is enabled
 * @returns {Promise<boolean>}
 */
export async function isDailyDigestMode() {
  const mode = await getEmailNotificationMode();
  return mode === 'daily_digest';
}