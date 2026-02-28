/**
 * Local TF-IDF Vector Embedding Service
 *
 * Builds vectors from complaint text WITHOUT any API calls.
 * "Training" happens automatically as complaints accumulate in MongoDB.
 *
 * Pipeline:
 *   1. tokenize + stem complaint text
 *   2. Build IDF from all stored complaints (corpus)
 *   3. Represent each complaint as a sparse TF-IDF vector
 *   4. Cosine similarity for duplicate detection
 */

const Complaint = require('../models/Complaint');

class LocalEmbeddingService {
    constructor() {
        this.stopwords = new Set([
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
            'used', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him',
            'his', 'she', 'her', 'they', 'them', 'their', 'it', 'its', 'this',
            'that', 'these', 'those', 'and', 'or', 'but', 'if', 'because', 'as',
            'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against',
            'between', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over',
            'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
            'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
            'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than',
            'too', 'very', 'just', 'dont', 'also', 'please', 'sir',
        ]);

        // IDF weights built from corpus
        this.idfCache = null;
        this.vocabCache = null;
        this.corpusSize = 0;
        this.cacheTs = 0;
        this.cacheTTL = 60 * 1000; // rebuild IDF every 60s
    }

    // ─── Tokenisation & Stemming ──────────────────────────────────────────────

    tokenize(text) {
        if (!text) return [];
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .map(t => this.simpleStem(t))
            .filter(t => t.length > 2 && !this.stopwords.has(t));
    }

    simpleStem(word) {
        // Minimal suffix stripping (Porter-style approximation)
        if (word.length <= 3) return word;
        if (word.endsWith('ings')) return word.slice(0, -4);
        if (word.endsWith('ing')) return word.slice(0, -3);
        if (word.endsWith('tion')) return word.slice(0, -4) + 't';
        if (word.endsWith('ness')) return word.slice(0, -4);
        if (word.endsWith('ment')) return word.slice(0, -4);
        if (word.endsWith('able')) return word.slice(0, -4);
        if (word.endsWith('ible')) return word.slice(0, -4);
        if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
        if (word.endsWith('es')) return word.slice(0, -2);
        if (word.endsWith('ed')) return word.slice(0, -2);
        if (word.endsWith('ly')) return word.slice(0, -2);
        if (word.endsWith('er')) return word.slice(0, -2);
        if (word.endsWith('s') && word.length > 4) return word.slice(0, -1);
        return word;
    }

    // ─── Build IDF from corpus ────────────────────────────────────────────────

    async getIDF() {
        const now = Date.now();
        if (this.idfCache && now - this.cacheTs < this.cacheTTL) {
            return { idf: this.idfCache, vocab: this.vocabCache, N: this.corpusSize };
        }

        try {
            const complaints = await Complaint.find({}).select('heading description department').lean();
            const N = complaints.length;
            if (N === 0) return { idf: {}, vocab: [], N: 0 };

            // Document Frequency: how many docs contain each term
            const df = {};
            for (const c of complaints) {
                const text = `${c.heading} ${c.description} ${c.department}`;
                const tokens = new Set(this.tokenize(text));
                for (const t of tokens) {
                    df[t] = (df[t] || 0) + 1;
                }
            }

            // IDF = log((N + 1) / (df + 1)) + 1  (smoothed)
            const idf = {};
            for (const [term, freq] of Object.entries(df)) {
                idf[term] = Math.log((N + 1) / (freq + 1)) + 1;
            }

            // Vocabulary: top 1000 terms by IDF (most discriminative)
            const vocab = Object.entries(idf)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 1000)
                .map(([t]) => t);

            this.idfCache = idf;
            this.vocabCache = vocab;
            this.corpusSize = N;
            this.cacheTs = now;

            console.log(`📚 TF-IDF corpus: ${N} complaints, ${vocab.length} vocab terms`);
            return { idf, vocab, N };
        } catch (err) {
            console.warn('IDF build error:', err.message);
            return { idf: {}, vocab: [], N: 0 };
        }
    }

    // ─── Generate TF-IDF vector for a text ───────────────────────────────────

    async embed(text) {
        const { idf, vocab } = await this.getIDF();
        if (vocab.length === 0) {
            // Cold start: return a simple hash-based vector
            return this.hashVector(text, 128);
        }

        const tokens = this.tokenize(text);
        const tf = {};
        for (const t of tokens) {
            tf[t] = (tf[t] || 0) + 1;
        }
        const total = tokens.length || 1;

        // Build vocab-aligned vector
        const vec = vocab.map(term => {
            const termTf = (tf[term] || 0) / total;
            const termIdf = idf[term] || 0;
            return termTf * termIdf;
        });

        return this.normalize(vec);
    }

    // ─── Fallback: hash-based vector (cold start) ─────────────────────────────

    hashVector(text, dim = 128) {
        const tokens = this.tokenize(text);
        const vec = new Array(dim).fill(0);
        for (const token of tokens) {
            let h = 5381;
            for (let i = 0; i < token.length; i++) {
                h = ((h << 5) + h) ^ token.charCodeAt(i);
                h = h & 0x7fffffff;
            }
            const idx = h % dim;
            const sign = ((h >> 7) & 1) ? 1 : -1;
            vec[idx] += sign;
        }
        return this.normalize(vec);
    }

    // ─── Cosine similarity ────────────────────────────────────────────────────

    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) return 0;
        let dot = 0, nA = 0, nB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            nA += a[i] * a[i];
            nB += b[i] * b[i];
        }
        const denom = Math.sqrt(nA) * Math.sqrt(nB);
        return denom === 0 ? 0 : dot / denom;
    }

    normalize(vec) {
        const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
        if (mag === 0) return vec;
        return vec.map(v => v / mag);
    }

    // ─── Find similar complaints ──────────────────────────────────────────────

    async findSimilar(queryEmbedding, excludeId = null, topK = 3, threshold = 0.60) {
        if (!queryEmbedding?.length) return [];
        try {
            const query = {
                status: { $nin: ['submitted', 'ai_review', 'ai_rejected'] },
            };
            if (excludeId) query._id = { $ne: excludeId };

            const candidates = await Complaint.find(query)
                .select('complaintId heading description department status embedding')
                .lean();

            return candidates
                .filter(c => c.embedding?.length > 0)
                .map(c => ({
                    complaint: c,
                    similarity: this.cosineSimilarity(queryEmbedding, c.embedding),
                }))
                .filter(r => r.similarity >= threshold)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topK);
        } catch (err) {
            console.warn('Similarity search error:', err.message);
            return [];
        }
    }

    // ─── Pre-build embeddings for all existing complaints (backfill) ──────────

    async backfillEmbeddings() {
        try {
            const complaints = await Complaint.find({ embedding: { $exists: false } })
                .select('complaintId heading description department embedding') // Must select complaintId so pre-save hook doesn't regenerate it
                .limit(50);

            if (complaints.length === 0) return;
            console.log(`🔄 Backfilling embeddings for ${complaints.length} complaints...`);

            for (const c of complaints) {
                const text = `${c.department} ${c.heading} ${c.description}`;
                c.embedding = await this.embed(text);
                await c.save();
            }
            console.log(`✅ Backfilled ${complaints.length} complaint embeddings`);
        } catch (err) {
            console.warn('Backfill error:', err.message);
        }
    }
}

module.exports = new LocalEmbeddingService();
