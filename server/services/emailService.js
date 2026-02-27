/**
 * Email Service - Simulated email sending (logs to console + stores in DB)
 */

class EmailService {
    /**
     * Send an email (simulated)
     */
    async sendEmail({ to, subject, body, reference }) {
        console.log('\n══════════════════════════════════════════');
        console.log('📧 EMAIL SENT (SIMULATED)');
        console.log('══════════════════════════════════════════');
        console.log(`To: ${to || 'Concerned Authority'}`);
        console.log(`Subject: ${subject}`);
        console.log(`Reference: ${reference || 'N/A'}`);
        console.log('──────────────────────────────────────────');
        console.log(body);
        console.log('══════════════════════════════════════════\n');

        return {
            success: true,
            message: 'Email sent successfully (simulated)',
            sentAt: new Date(),
            to,
            subject,
            reference,
        };
    }

    /**
     * Send notification to user
     */
    async sendNotification(userId, message, type = 'info') {
        console.log(`\n🔔 NOTIFICATION [${type.toUpperCase()}] to User ${userId}: ${message}\n`);
        return {
            success: true,
            userId,
            message,
            type,
            sentAt: new Date(),
        };
    }

    /**
     * Send escalation notification
     */
    async sendEscalationNotification(complaint) {
        return this.sendNotification(
            complaint.userId,
            `Your complaint ${complaint.complaintId} has been escalated due to non-response from the authority within the deadline. You may now choose to file a lawsuit.`,
            'warning'
        );
    }
}

module.exports = new EmailService();
