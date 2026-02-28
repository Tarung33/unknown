/**
 * AI Service — Gemini + Local TF-IDF RAG
 *
 * Pipeline:
 *   1. [Optional] Gemini Vision: analyse uploaded images (OCR + evidence)
 *   2. Local TF-IDF embedding (NO API calls — instant, no rate limits)
 *   3. Cosine similarity search against stored embeddings → RAG context
 *   4. ONE Gemini call: final analysis + verdict
 *   5. ONE Gemini call: government order generation
 *
 * This design keeps Gemini API calls to a minimum (≤2 per complaint)
 * and uses local vector embeddings that "train" as more complaints accumulate.
 */

const fs = require('fs');
const path = require('path');
const Complaint = require('../models/Complaint');
const localEmbedding = require('./localEmbedding');
const textExtractionService = require('./textExtractionService');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

class AIService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.generateUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        this.maxRetries = 3;
        this.baseDelay = 3000; // 3s → 6s → 12s backoff
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    // ─── Gemini Generate (text) with retry ───────────────────────────────────

    async callGemini(prompt, genConfig = {}, attempt = 1) {
        const res = await fetch(`${this.generateUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 1024, ...genConfig },
            }),
        });

        if (res.status === 429 && attempt < this.maxRetries) {
            const delay = this.baseDelay * Math.pow(2, attempt - 1);
            console.log(`⏳ Rate limited. Retry ${attempt}/${this.maxRetries} in ${delay / 1000}s...`);
            await this.sleep(delay);
            return this.callGemini(prompt, genConfig, attempt + 1);
        }
        if (res.status === 429) { console.warn('⚠️ Rate limit exceeded. Using fallback.'); return null; }
        if (!res.ok) { console.error(`Gemini error: ${res.status}`); return null; }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    // ─── Document Text Extraction (Local OCR) ─────────────────────────────────

    async extractLocalText(documents) {
        if (!documents || documents.length === 0) return null;
        console.log(`📑 Extracting text from ${documents.length} document(s)...`);

        try {
            const extractedText = await textExtractionService.processDocuments(documents);
            if (!extractedText) return null;

            return {
                overallSummary: "Document text was extracted locally via OCR.",
                extractedContext: extractedText,
                evidenceScore: extractedText.length > 50 ? 80 : 40,
            };
        } catch (e) {
            console.error('OCR/Text Extraction failed:', e.message);
            return null;
        }
    }

    // ─── Main Complaint Analysis ──────────────────────────────────────────────

    async analyzeComplaint(complaint, documents = []) {
        try {
            if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
                return { analysis: this.ruleBasedAnalysis(complaint), embedding: null };
            }

            // Step 1: Text extraction from documents (Local OCR via Tesseract/pdf-parse)
            let imageAnalysis = null;
            let documentContext = '';

            if (documents.length > 0) {
                imageAnalysis = await this.extractLocalText(documents);
                if (imageAnalysis) {
                    documentContext = `\nATTACHED DOCUMENTS CONTENT (OCR/Extracted):\n${imageAnalysis.extractedContext}\n`;
                }
            }

            // Step 2: LOCAL TF-IDF embedding (NO API — instant)
            const embeddingText = [
                `Department: ${complaint.department}`,
                `Title: ${complaint.heading}`,
                `Description: ${complaint.description}`,
                `Location: ${complaint.location?.address || ''}`,
                imageAnalysis ? `Extracted Document Text: ${imageAnalysis.extractedContext.substring(0, 500)}` : '',
            ].filter(Boolean).join('\n');

            const embedding = await localEmbedding.embed(embeddingText);
            console.log(`🔢 Local TF-IDF embedding: ${embedding.length} dims (no API call)`);

            // Step 3: RAG — find similar past complaints using local cosine similarity
            let ragContext = '';
            const similar = await localEmbedding.findSimilar(embedding, complaint._id);
            if (similar.length > 0) {
                ragContext = `\nSIMILAR PAST COMPLAINTS (semantic duplicates):\n`;
                similar.forEach(({ complaint: c, similarity }, idx) => {
                    ragContext += `[${idx + 1}] ${(similarity * 100).toFixed(1)}% match | ${c.complaintId} | ${c.heading}\n`;
                    ragContext += `  "${c.description?.substring(0, 100)}"\n`;
                });
                ragContext += '\n';
            }

            // Step 4: ONE Gemini call — final analysis
            const prompt = `You are a government complaint analysis AI.
${ragContext}${documentContext}
COMPLAINT:
- Department: ${complaint.department}
- Title: ${complaint.heading}
- Description: ${complaint.description}
- Location: ${complaint.location?.address || 'Not provided'}

ANALYSE:
1. Is this a genuine, valid complaint?
2. Is it a duplicate of any similar past complaints listed?
3. Does the attached document/image text support the claim?
4. Severity: low / medium / high / critical
5. Category

RESPOND IN EXACT JSON (no markdown):
{
  "isValid": true,
  "score": 0,
  "verdict": "...",
  "flags": [],
  "category": "...",
  "severity": "medium",
  "isDuplicate": false,
  "duplicateOf": null,
  "isSpam": false,
  "imageVerdict": "..."
}`;

            const text = await this.callGemini(prompt);
            if (!text) {
                const ruleBased = this.ruleBasedAnalysis(complaint);
                ruleBased.extractedText = imageAnalysis?.extractedContext || null;
                ruleBased.evidenceScore = imageAnalysis?.evidenceScore ?? null;
                return { analysis: ruleBased, embedding };
            }

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                const analysis = {
                    isValid: parsed.isDuplicate ? false : parsed.isValid,
                    score: parsed.isDuplicate ? Math.min(parsed.score, 30) : parsed.score,
                    verdict: parsed.isDuplicate ? `⚠️ DUPLICATE (${parsed.duplicateOf}): ${parsed.verdict}` : parsed.verdict,
                    flags: parsed.isDuplicate ? [...(parsed.flags || []), `Duplicate of ${parsed.duplicateOf || 'existing complaint'}`] : (parsed.flags || []),
                    category: parsed.category || complaint.department,
                    severity: parsed.severity || 'medium',
                    imageVerdict: parsed.imageVerdict || (imageAnalysis?.overallSummary ?? 'No images provided'),
                    extractedText: imageAnalysis?.extractedContext || null,
                    evidenceScore: imageAnalysis?.evidenceScore ?? null,
                    analyzedAt: new Date(),
                };

                console.log(`🤖 AI Analysis: score=${analysis.score}, valid=${analysis.isValid}, severity=${analysis.severity}`);
                return { analysis, embedding };
            }

            const ruleBased = this.ruleBasedAnalysis(complaint);
            ruleBased.extractedText = imageAnalysis?.extractedContext || null;
            ruleBased.evidenceScore = imageAnalysis?.evidenceScore ?? null;
            return { analysis: ruleBased, embedding };
        } catch (error) {
            console.error('AI Analysis error:', error.message);
            const ruleBased = this.ruleBasedAnalysis(complaint);
            ruleBased.extractedText = imageAnalysis?.extractedContext || null;
            ruleBased.evidenceScore = imageAnalysis?.evidenceScore ?? null;
            return { analysis: ruleBased, embedding: null };
        }
    }

    // ─── Rule-based fallback ──────────────────────────────────────────────────

    ruleBasedAnalysis(complaint) {
        const flags = [];
        let score = 70, isValid = true, severity = 'medium';

        if (!complaint.description || complaint.description.length < 20) {
            flags.push('Description too short'); score -= 30; isValid = false;
        }
        if (!complaint.heading || complaint.heading.length < 5) {
            flags.push('Heading too short'); score -= 20;
        }
        const spamP = /(.)\\1{5,}|test|asdf|qwerty|xxx|spam|fake/gi;
        if (spamP.test(complaint.description) || spamP.test(complaint.heading)) {
            flags.push('Potential spam'); score -= 40; isValid = false;
        }
        const critKW = /emergency|danger|life.?threatening|death|accident|collapse|fire/gi;
        const highKW = /urgent|immediate|health.?hazard|flooding|sewage|electric/gi;
        if (critKW.test(complaint.description)) { severity = 'critical'; score += 10; }
        else if (highKW.test(complaint.description)) { severity = 'high'; score += 5; }

        score = Math.max(0, Math.min(100, score));
        return {
            isValid: isValid && score >= 40,
            score,
            verdict: isValid ? 'Valid — Google AI Rate Limit Exceeded (Offline Fallback Mode)' : 'Flagged (Offline Fallback Mode)',
            flags,
            category: complaint.department,
            severity,
            imageVerdict: 'AI Generation Unavailable — Free Tier 15 RPM Quota Exhausted',
            analyzedAt: new Date(),
        };
    }

    // ─── Government Order ─────────────────────────────────────────────────────

    async generateGovtOrder(complaint, analysis) {
        try {
            if (!this.apiKey || this.apiKey === 'your_gemini_api_key_here') {
                return this.govtOrderTemplate(complaint, analysis);
            }

            const prompt = `Generate a formal government complaint order document.

COMPLAINT ID: ${complaint.complaintId}
ANONYMOUS ID: ${complaint.anonymousId}
Department: ${complaint.department}
Title: ${complaint.heading}
Description: ${complaint.description}
Location: ${complaint.location?.address || 'As mentioned'}
AI Severity: ${analysis.severity}
AI Score: ${analysis.score}/100
Image Evidence: ${analysis.imageVerdict || 'None'}
Extracted OCR Text: ${analysis.extractedText ? analysis.extractedText.substring(0, 1000) : 'None'}

Write a formal government order:
1. Header: "GOVERNMENT OF INDIA — CIVIC SHIELD"
2. Order number and date
3. Complaint details
4. Directive to department: investigate + resolve within 5-6 working days
5. Legal consequences of non-compliance

Return ONLY the document text, no markdown.`;

            const text = await this.callGemini(prompt, { temperature: 0.4, maxOutputTokens: 2048 });
            if (!text) return this.govtOrderTemplate(complaint, analysis);
            return { content: text, generatedAt: new Date() };
        } catch (error) {
            console.error('Govt order error:', error.message);
            return this.govtOrderTemplate(complaint, analysis);
        }
    }

    govtOrderTemplate(complaint, analysis) {
        const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        const ordNo = `GO/${complaint.complaintId}/${Date.now().toString().slice(-6)}`;
        const content = `
════════════════════════════════════════════════════════════
    GOVERNMENT OF INDIA — CIVIC SHIELD
    OFFICIAL COMPLAINT ORDER
════════════════════════════════════════════════════════════

Order No : ${ordNo}
Date     : ${date}
Ref      : Complaint ID ${complaint.complaintId}

TO: Head of Department — ${complaint.department}

SUBJECT: Action Required on Complaint "${complaint.heading}"

COMPLAINT DETAILS:
  Complainant  : ${complaint.anonymousId} (Anonymous)
  Department   : ${complaint.department}
  Category     : ${analysis.category}
  Severity     : ${analysis.severity?.toUpperCase()}
  AI Score     : ${analysis.score}/100
  Location     : ${complaint.location?.address || 'As described'}

DESCRIPTION:
${complaint.description}

EVIDENCE & OCR TEXT:
${analysis.imageVerdict}
${analysis.evidenceScore != null ? `Evidence Score: ${analysis.evidenceScore}/100` : ''}
${analysis.extractedText ? `\nExtracted Content:\n${analysis.extractedText}` : ''}

AI ASSESSMENT:
  Verdict  : ${analysis.verdict}
  Severity : ${analysis.severity?.toUpperCase()}
  Flags    : ${analysis.flags?.join(', ') || 'None'}

ORDER:
The ${complaint.department} is directed to:
1. Acknowledge within 24 hours
2. Begin investigation immediately
3. Submit progress report in 3 working days
4. Resolve within 5-6 working days
5. File completion report upon resolution

Non-compliance will result in legal escalation.

════════════════════════════════════════════════════════════
Civic Shield · Government of India
════════════════════════════════════════════════════════════`;

        return { content, generatedAt: new Date() };
    }
}

module.exports = new AIService();
