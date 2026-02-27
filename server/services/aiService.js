/**
 * AI Service - RAG Complaint Analysis using Gemini API
 * Analyzes complaints for validity, spam, duplicates, and generates govt orders
 */

class AIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        this.maxRetries = 3;
        this.baseDelay = 2000; // 2 seconds initial delay
    }

    /**
     * Helper: call Gemini API with retry + exponential backoff
     */
    async callGeminiWithRetry(prompt, generationConfig, attempt = 1) {
        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig,
            }),
        });

        if (response.status === 429 && attempt < this.maxRetries) {
            const delay = this.baseDelay * Math.pow(2, attempt - 1);
            console.log(`⏳ Gemini rate limited (429). Retry ${attempt}/${this.maxRetries} in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.callGeminiWithRetry(prompt, generationConfig, attempt + 1);
        }

        if (response.status === 429) {
            console.warn(`⚠️ Gemini rate limit exceeded after ${this.maxRetries} retries. Using rule-based fallback.`);
            return null;
        }

        if (!response.ok) {
            console.error(`Gemini API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    async analyzeComplaint(complaint) {
        try {
            // If no API key, use rule-based fallback
            if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
                return this.ruleBasedAnalysis(complaint);
            }

            const prompt = `You are a government complaint analysis AI. Analyze the following citizen complaint and provide a structured assessment.

COMPLAINT DETAILS:
- Department: ${complaint.department}
- Heading: ${complaint.heading}
- Description: ${complaint.description}
- Location: ${complaint.location?.address || 'Not provided'}

ANALYZE FOR:
1. Is this a valid, genuine complaint? (not spam, not abusive, not irrelevant)
2. Is this a duplicate or repetitive complaint?
3. Does it contain unknown/meaningless/spam content?
4. What is the severity? (low/medium/high/critical)
5. What category does this fall under?
6. Brief verdict explaining your assessment

RESPOND IN THIS EXACT JSON FORMAT ONLY (no markdown, no code blocks):
{
  "isValid": true/false,
  "score": 0-100,
  "verdict": "brief explanation",
  "flags": ["flag1", "flag2"],
  "category": "category name",
  "severity": "low/medium/high/critical",
  "isDuplicate": false,
  "isSpam": false,
  "suggestedDepartment": "correct department if misclassified"
}`;

            const text = await this.callGeminiWithRetry(prompt, {
                temperature: 0.3,
                maxOutputTokens: 1024,
            });

            if (!text) return this.ruleBasedAnalysis(complaint);

            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                return {
                    isValid: analysis.isValid,
                    score: analysis.score,
                    verdict: analysis.verdict,
                    flags: analysis.flags || [],
                    category: analysis.category || complaint.department,
                    severity: analysis.severity || 'medium',
                    analyzedAt: new Date(),
                };
            }

            return this.ruleBasedAnalysis(complaint);
        } catch (error) {
            console.error('AI Analysis error:', error.message);
            return this.ruleBasedAnalysis(complaint);
        }
    }

    ruleBasedAnalysis(complaint) {
        const flags = [];
        let score = 70;
        let isValid = true;
        let severity = 'medium';

        // Check for empty/short content
        if (!complaint.description || complaint.description.length < 20) {
            flags.push('Description too short');
            score -= 30;
            isValid = false;
        }

        if (!complaint.heading || complaint.heading.length < 5) {
            flags.push('Heading too short');
            score -= 20;
        }

        // Check for spam patterns
        const spamPatterns = /(.)\1{5,}|test|asdf|qwerty|xxx|spam|fake/gi;
        if (spamPatterns.test(complaint.description) || spamPatterns.test(complaint.heading)) {
            flags.push('Potential spam content detected');
            score -= 40;
            isValid = false;
        }

        // Check for abusive content
        const abusivePatterns = /\b(stupid|idiot|fool|damn|hell)\b/gi;
        if (abusivePatterns.test(complaint.description)) {
            flags.push('Potentially inappropriate language');
            score -= 15;
        }

        // Assess severity based on keywords
        const criticalKeywords = /emergency|danger|life.?threatening|death|accident|collapse|fire/gi;
        const highKeywords = /urgent|immediate|health.?hazard|flooding|sewage|electric/gi;

        if (criticalKeywords.test(complaint.description)) {
            severity = 'critical';
            score += 10;
        } else if (highKeywords.test(complaint.description)) {
            severity = 'high';
            score += 5;
        }

        score = Math.max(0, Math.min(100, score));

        return {
            isValid: isValid && score >= 40,
            score,
            verdict: isValid ? 'Complaint appears valid and has been verified for processing.' : 'Complaint flagged for review due to quality issues.',
            flags,
            category: complaint.department,
            severity,
            analyzedAt: new Date(),
        };
    }

    async generateGovtOrder(complaint, analysis) {
        try {
            if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
                return this.generateGovtOrderTemplate(complaint, analysis);
            }

            const prompt = `Generate a formal government complaint order document based on the following:

COMPLAINT ID: ${complaint.complaintId}
ANONYMOUS ID: ${complaint.anonymousId}
Department: ${complaint.department}
Heading: ${complaint.heading}
Description: ${complaint.description}
Location: ${complaint.location?.address || 'Not provided'}
Severity: ${analysis.severity}
Category: ${analysis.category}

Generate a formal government order document that:
1. Has a proper header with "GOVERNMENT OF INDIA - CIVIC SHIELD COMPLAINT MANAGEMENT SYSTEM"
2. Includes order number, date
3. References the complaint details
4. Orders the relevant department to investigate and take action
5. Sets a timeline for resolution
6. Is professional and formal in tone

Return ONLY the document text, no markdown formatting.`;

            const text = await this.callGeminiWithRetry(prompt, {
                temperature: 0.5,
                maxOutputTokens: 2048,
            });

            if (!text) return this.generateGovtOrderTemplate(complaint, analysis);

            return {
                content: text,
                generatedAt: new Date(),
            };
        } catch (error) {
            console.error('Govt order generation error:', error.message);
            return this.generateGovtOrderTemplate(complaint, analysis);
        }
    }

    generateGovtOrderTemplate(complaint, analysis) {
        const date = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });

        const orderNumber = `GO/${complaint.complaintId}/${Date.now().toString().slice(-6)}`;

        const content = `
════════════════════════════════════════════════════════════════
          GOVERNMENT OF INDIA
          CIVIC SHIELD COMPLAINT MANAGEMENT SYSTEM
          OFFICIAL GOVERNMENT ORDER
════════════════════════════════════════════════════════════════

Order No: ${orderNumber}
Date: ${date}
Reference: Complaint ID ${complaint.complaintId}

TO: The Head of Department
    ${complaint.department}
    
SUBJECT: Official Complaint Regarding - ${complaint.heading}

═══════════════════════════════════════════════════════════════

COMPLAINT DETAILS:

Complainant ID: ${complaint.anonymousId}
Department: ${complaint.department}
Category: ${analysis.category}
Severity: ${analysis.severity?.toUpperCase()}
Location: ${complaint.location?.address || 'As mentioned in complaint'}

DESCRIPTION:
${complaint.description}

═══════════════════════════════════════════════════════════════

AI ANALYSIS REPORT:
- Validity Score: ${analysis.score}/100
- Assessment: ${analysis.verdict}
- Classification: ${analysis.category}
- Priority Level: ${analysis.severity?.toUpperCase()}
${analysis.flags?.length > 0 ? `- Flags: ${analysis.flags.join(', ')}` : ''}

═══════════════════════════════════════════════════════════════

ORDER:

In exercise of the powers conferred under the Civic Shield Complaint
Management System, the ${complaint.department} is hereby directed to:

1. Acknowledge receipt of this complaint within 24 hours
2. Initiate investigation into the matter immediately
3. Submit a progress report within 3 working days
4. Resolve the complaint within 5-6 working days from the date of this order
5. File a resolution report upon completion

Non-compliance with the above directives may result in escalation
to higher authorities and potential legal proceedings.

═══════════════════════════════════════════════════════════════

This is a system-generated document.
Civic Shield Complaint Management System
Government of India

════════════════════════════════════════════════════════════════`;

        return {
            content,
            generatedAt: new Date(),
        };
    }
}

module.exports = new AIService();
