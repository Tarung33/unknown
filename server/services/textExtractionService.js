/**
 * Local Text Extraction Service (OCR for Images + PDF parsing)
 * Runs entirely locally to avoid API rate limits.
 */
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

class TextExtractionService {

    async extractTextFromDocument(fileName, mimeType) {
        try {
            const filePath = path.join(UPLOADS_DIR, fileName);
            if (!fs.existsSync(filePath)) {
                console.warn(`File not found for extraction: ${filePath}`);
                return null;
            }

            // 1. Image OCR (Local via Tesseract.js)
            if (mimeType.startsWith('image/')) {
                console.log(`🔍 Running local OCR on ${fileName}...`);
                const result = await Tesseract.recognize(filePath, 'eng', {
                    logger: m => { } // suppress progress logs to keep console clean
                });
                return result.data.text.trim();
            }

            // 2. PDF Parsing (Local via pdf-parse)
            if (mimeType === 'application/pdf') {
                console.log(`📄 Extracting text from PDF ${fileName}...`);
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdfParse(dataBuffer);
                return data.text.trim();
            }

            return null; // unsupported format

        } catch (error) {
            console.error(`Extraction failed for ${fileName}:`, error.message);
            return null;
        }
    }

    // Process an array of document objects and return a combined summary string
    async processDocuments(documents = []) {
        if (!documents || documents.length === 0) return '';

        let extractedContext = '';

        for (const doc of documents) {
            const text = await this.extractTextFromDocument(doc.filename, doc.mimetype);
            if (text && text.length > 5) {
                // Keep it bounded so we don't blow up the prompt context window
                const truncated = text.length > 1500 ? text.substring(0, 1500) + '... (truncated)' : text;
                extractedContext += `\n[Document: ${doc.originalName}]\nExtracted Content: ${truncated}\n`;
            } else {
                extractedContext += `\n[Document: ${doc.originalName}]\nExtracted Content: (No readable text detected in this document)\n`;
            }
        }

        return extractedContext;
    }
}

module.exports = new TextExtractionService();
