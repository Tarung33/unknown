/**
 * Escalation Service - Monitors complaint deadlines and handles escalation
 */
const Complaint = require('../models/Complaint');

class EscalationService {
    /**
     * Check for complaints that have exceeded the 5-6 working day deadline
     */
    async checkEscalations() {
        try {
            const now = new Date();

            // Find complaints sent to authority with past escalation deadline
            const overdueComplaints = await Complaint.find({
                status: 'sent_to_authority',
                escalationDeadline: { $lte: now },
            });

            for (const complaint of overdueComplaints) {
                await this.escalateComplaint(complaint);
            }

            return overdueComplaints.length;
        } catch (error) {
            console.error('Escalation check error:', error.message);
            return 0;
        }
    }

    /**
     * Mark a complaint as escalated and prepare for lawsuit
     */
    async escalateComplaint(complaint) {
        complaint.status = 'escalated';
        complaint.statusHistory.push({
            status: 'escalated',
            message: 'Authority failed to respond within the deadline. Complaint has been escalated. You may now file a lawsuit.',
            timestamp: new Date(),
            updatedBy: 'system',
        });

        await complaint.save();
        console.log(`Complaint ${complaint.complaintId} escalated due to non-response`);
        return complaint;
    }

    /**
     * Calculate escalation deadline (5-6 working days from now)
     */
    calculateDeadline(fromDate = new Date()) {
        const deadline = new Date(fromDate);
        let workingDays = 0;

        while (workingDays < 6) {
            deadline.setDate(deadline.getDate() + 1);
            const day = deadline.getDay();
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (day !== 0 && day !== 6) {
                workingDays++;
            }
        }

        return deadline;
    }

    /**
     * Generate lawsuit email template
     */
    generateLawsuitEmail(complaint) {
        const date = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });

        return {
            subject: `Legal Notice - Non-Action on Complaint ${complaint.complaintId}`,
            body: `
LEGAL NOTICE

Date: ${date}

To,
The Head of Department,
${complaint.department}

Subject: Legal Notice regarding non-action on Complaint ID: ${complaint.complaintId}

Dear Sir/Madam,

This is to bring to your notice that a formal complaint (ID: ${complaint.complaintId}) was registered through the Civic Shield Complaint Management System regarding "${complaint.heading}".

Despite the complaint being verified, approved by the administrative officer, and forwarded to your department for resolution, NO action has been taken within the stipulated time frame of 5-6 working days.

COMPLAINT DETAILS:
- Complaint ID: ${complaint.complaintId}
- Department: ${complaint.department}
- Filed On: ${new Date(complaint.createdAt).toLocaleDateString('en-IN')}
- Deadline: ${complaint.escalationDeadline ? new Date(complaint.escalationDeadline).toLocaleDateString('en-IN') : 'Expired'}
- Status: Escalated due to non-response

As per the Right to Information Act 2005, Public Grievance Redressal mechanism, and various State Grievance Redressal Acts, every citizen has the right to timely redressal of their grievances.

The failure to act on this complaint constitutes:
1. Violation of citizen's right to grievance redressal
2. Negligence of official duty
3. Potential grounds for legal action under Section 4 of the RTI Act

This notice serves as a formal warning. If no satisfactory response is received within 15 days from the date of this notice, the complainant reserves the right to:
1. File a formal complaint with the State Human Rights Commission
2. Approach the High Court under Article 226 of the Constitution
3. File an RTI application seeking reasons for non-action
4. Report the matter to the Anti-Corruption Bureau

We strongly advise immediate action on the said complaint.

Yours faithfully,
[Through Civic Shield Complaint Management System]
Complaint Reference: ${complaint.complaintId}
      `.trim(),
            reference: complaint.complaintId,
        };
    }

    /**
     * Get lawsuit filing procedure
     */
    getLawsuitProcedure() {
        return {
            steps: [
                {
                    step: 1,
                    title: 'Document Everything',
                    description: 'Save all complaint details, tracking history, government order, and escalation notifications as evidence.',
                },
                {
                    step: 2,
                    title: 'Send Legal Notice',
                    description: 'A legal notice will be sent to the concerned authority via email through our platform. Keep a copy for your records.',
                },
                {
                    step: 3,
                    title: 'Wait for Response',
                    description: 'Allow 15 days for the authority to respond to the legal notice.',
                },
                {
                    step: 4,
                    title: 'File RTI Application',
                    description: 'File an RTI application at rtionline.gov.in seeking reasons for non-action on your complaint.',
                    link: 'https://rtionline.gov.in',
                },
                {
                    step: 5,
                    title: 'Approach Consumer Forum / Lokpal',
                    description: 'File a complaint with the State Consumer Forum or Lokpal portal for grievance redressal.',
                    link: 'https://lokpal.gov.in',
                },
                {
                    step: 6,
                    title: 'File Case in Court',
                    description: 'If all else fails, file a case through the eFiling portal of Indian Courts.',
                    link: 'https://efiling.ecourts.gov.in',
                },
                {
                    step: 7,
                    title: 'Seek Legal Aid',
                    description: 'If you need free legal assistance, contact the National Legal Services Authority (NALSA).',
                    link: 'https://nalsa.gov.in',
                },
            ],
            platforms: [
                { name: 'eFiling - Indian Courts', url: 'https://efiling.ecourts.gov.in', description: 'File cases electronically in Indian courts' },
                { name: 'RTI Online', url: 'https://rtionline.gov.in', description: 'File Right to Information applications' },
                { name: 'CPGRAMS', url: 'https://pgportal.gov.in', description: 'Centralized Public Grievance Portal' },
                { name: 'Lokpal Portal', url: 'https://lokpal.gov.in', description: 'Anti-corruption ombudsman' },
                { name: 'NALSA', url: 'https://nalsa.gov.in', description: 'Free legal aid services' },
                { name: 'National Consumer Helpline', url: 'https://consumerhelpline.gov.in', description: 'Consumer complaint portal' },
            ],
        };
    }
}

module.exports = new EscalationService();
