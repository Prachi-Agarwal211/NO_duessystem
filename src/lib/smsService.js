/**
 * SMS Service
 * Abstraction layer for sending SMS notifications
 * Currently logs to console in development, ready for provider integration (e.g., Twilio, AWS SNS)
 */
export const SmsService = {
    /**
     * Send an SMS message
     * @param {string} to - Recipient phone number (e.g., +919876543210)
     * @param {string} message - Message content
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    sendSMS: async (to, message) => {
        try {
            if (!to || !message) {
                console.warn('⚠️ SMS Service: Missing recipient or message');
                return { success: false, error: 'Missing parameters' };
            }

            // Check if SMS is enabled via env var
            const smsEnabled = process.env.SMS_ENABLED === 'true';

            // 📝 LOGGING (Always log in Development)
            console.log('📱 [SMS Mock] To:', to);
            console.log('   Message:', message);

            if (!smsEnabled) {
                return { success: true, mocked: true };
            }

            // TODO: Integrate actual SMS Provider here (Twilio/AWS SNS/Msg91)
            // Example Twilio Implementation:
            // const client = require('twilio')(accountSid, authToken);
            // await client.messages.create({ to, from: fromNumber, body: message });

            return { success: true };

        } catch (error) {
            console.error('❌ SMS Service Error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Standard templates for consistent messaging
     */
    TEMPLATES: {
        SUBMISSION_CONFIRMED: (name, regNo) =>
            `Hi ${name}, your No Dues application (${regNo}) has been submitted successfully. You will be notified once processed. - JECRC University`,

        REJECTION_ALERT: (name, dept) =>
            `Alert: Your No Dues application has been rejected by ${dept} Department. Please check your email/dashboard for details. - JECRC University`,

        CERTIFICATE_READY: (name) =>
            `Congratulations ${name}! Your No Dues Certificate is ready. Download it from your dashboard. - JECRC University`
    }
};
