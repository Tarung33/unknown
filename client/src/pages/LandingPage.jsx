import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import './LandingPage.css';

const features = [
    {
        icon: '🛡️',
        title: 'Anonymous Filing',
        desc: 'Your identity is protected. Complaints are linked only to an anonymous ID derived from your Voter ID — never your name or personal details.',
    },
    {
        icon: '🤖',
        title: 'AI-Powered Verification',
        desc: 'Every complaint is analysed by Gemini AI for validity, severity, and duplicate detection using vector embeddings and semantic search.',
    },
    {
        icon: '🖼️',
        title: 'Image Evidence & OCR',
        desc: 'Attach photographs as evidence. Our AI reads and extracts text from images, verifying authenticity before forwarding to authorities.',
    },
    {
        icon: '📄',
        title: 'Government Order Generation',
        desc: 'Verified complaints trigger an AI-drafted formal Government Order directing the relevant department to act within a set deadline.',
    },
    {
        icon: '⚖️',
        title: 'Escalation & Legal Aid',
        desc: 'Ignored complaints automatically escalate. If still unresolved, you receive a legal notice template and guidance to approach courts.',
    },
    {
        icon: '📍',
        title: 'Department Auto-Routing',
        desc: 'Choose your department — Municipal, Health, PWD, Police and more. Complaints flow directly to the relevant admin and authority.',
    },
];

const steps = [
    {
        num: '01',
        title: 'Register & Verify',
        desc: 'Create an account with your Voter ID. Your identity is anonymised the moment your complaint is recorded.',
    },
    {
        num: '02',
        title: 'File Your Complaint',
        desc: 'Describe the issue, select the department, attach photos, and pin your location — manually or via GPS.',
    },
    {
        num: '03',
        title: 'AI Reviews Your Case',
        desc: 'Gemini AI analyses your complaint and evidence for genuineness and severity, then generates a formal Government Order.',
    },
    {
        num: '04',
        title: 'Admin Routes It',
        desc: 'The department admin reviews the AI-verified complaint and forwards it to the right authority with full case details.',
    },
    {
        num: '05',
        title: 'Authority Responds',
        desc: 'The assigned authority sends an official response. You are notified and can mark the issue as resolved or escalate further.',
    },
    {
        num: '06',
        title: 'Resolution or Escalation',
        desc: 'Unresolved complaints escalate automatically. Legal notice templates, RTI guidance, and court filing links are provided.',
    },
];

const pillars = [
    { icon: '🔒', title: 'Privacy First', desc: 'Identity anonymised via Voter ID hashing — no personal data stored in complaints.' },
    { icon: '⚡', title: 'Real-Time Tracking', desc: 'Live complaint status updates from submission all the way to resolution.' },
    { icon: '🏛️', title: 'Multi-Department', desc: '10+ departments — Municipal, Health, Police, PWD, Water, Education & more.' },
    { icon: '📊', title: 'AI Scoring', desc: 'Every complaint scored 0–100 for validity and severity by Gemini AI.' },
];

const LandingPage = () => {
    const observerRef = useRef(null);

    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
        );

        document.querySelectorAll('.reveal').forEach((el) => {
            observerRef.current.observe(el);
        });

        return () => observerRef.current?.disconnect();
    }, []);

    return (
        <div className="landing">

            {/* ── NAV ── */}
            <nav className="land-nav">
                <div className="land-nav-inner">
                    <div className="land-logo">
                        <span className="land-logo-icon">🛡️</span>
                        <span className="land-logo-text">Civic Shield</span>
                    </div>
                    <div className="land-nav-links">
                        <a href="#overview" className="land-nav-link">Overview</a>
                        <a href="#features" className="land-nav-link">Features</a>
                        <a href="#how" className="land-nav-link">How It Works</a>
                    </div>
                    <div className="land-nav-actions">
                        <Link to="/login" className="land-nav-login">Sign In</Link>
                        <Link to="/register" className="land-nav-register">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="land-hero">
                <div className="hero-bg-grid" />
                <div className="hero-content">
                    <div className="hero-tag reveal">Citizen Complaint Management System</div>
                    <h1 className="hero-title reveal">
                        Your Voice.<br />
                        <span className="hero-title-accent">Amplified.</span>
                    </h1>
                    <p className="hero-subtitle reveal">
                        File civic complaints anonymously. Let AI verify, prioritise, and route
                        them to the right authority — with legal escalation if they're ignored.
                    </p>
                    <div className="hero-actions reveal">
                        <Link to="/register" className="btn-hero-primary">
                            File a Complaint
                            <span className="btn-arrow">→</span>
                        </Link>
                        <Link to="/login" className="btn-hero-outline">
                            Sign In
                        </Link>
                    </div>
                    <div className="hero-stats reveal">
                        <div className="hero-stat">
                            <span className="hero-stat-num">AI</span>
                            <span className="hero-stat-label">Verified</span>
                        </div>
                        <div className="hero-stat-divider" />
                        <div className="hero-stat">
                            <span className="hero-stat-num">100%</span>
                            <span className="hero-stat-label">Anonymous</span>
                        </div>
                        <div className="hero-stat-divider" />
                        <div className="hero-stat">
                            <span className="hero-stat-num">Legal</span>
                            <span className="hero-stat-label">Escalation</span>
                        </div>
                    </div>
                    <a href="#overview" className="hero-scroll-down">
                        <span className="scroll-label">Scroll to explore</span>
                        <span className="scroll-arrow">↓</span>
                    </a>
                </div>
                <div className="hero-visual reveal">
                    <div className="hero-card-mock">
                        <div className="mock-header">
                            <span className="mock-dot" /><span className="mock-dot" /><span className="mock-dot" />
                            <span className="mock-title">Complaint #CS-000142</span>
                        </div>
                        <div className="mock-badge">✅ AI Verified — Score 91/100</div>
                        <div className="mock-field">
                            <span className="mock-label">Department</span>
                            <span className="mock-value">Municipal Corporation</span>
                        </div>
                        <div className="mock-field">
                            <span className="mock-label">Severity</span>
                            <span className="mock-value mock-high">HIGH</span>
                        </div>
                        <div className="mock-field">
                            <span className="mock-label">Status</span>
                            <span className="mock-value">Forwarded to Authority</span>
                        </div>
                        <div className="mock-order">📄 Government Order Generated</div>
                        <div className="mock-progress">
                            <div className="mock-progress-bar" style={{ width: '72%' }} />
                        </div>
                        <span className="mock-progress-label">Resolution in progress — 3 days remaining</span>
                    </div>
                </div>
            </section>

            {/* ── OVERVIEW ── */}
            <section className="land-section" id="overview">
                <div className="land-section-inner">
                    <div className="section-label reveal">Overview</div>
                    <h2 className="section-title reveal">What is Civic Shield?</h2>
                    <div className="overview-grid">
                        <div className="overview-text reveal">
                            <p>
                                Civic Shield is an AI-powered citizen complaint management system
                                built for transparency and accountability. Citizens can file complaints
                                anonymously against civic issues — from broken roads to health hazards —
                                and track them through every step of the resolution process.
                            </p>
                            <p style={{ marginTop: 16 }}>
                                Every complaint is automatically verified by Google Gemini AI, which
                                analyses the description, extracts text from uploaded images using OCR,
                                detects duplicates using vector embeddings, and generates a formal
                                Government Order directing the responsible department to act.
                            </p>
                            <p style={{ marginTop: 16 }}>
                                If the authority fails to respond within the deadline, the complaint
                                escalates automatically — providing legal notice templates, RTI guidance,
                                and court filing links to the citizen.
                            </p>
                        </div>
                        <div className="overview-pillars reveal">
                            {pillars.map((p, i) => (
                                <div key={i} className="overview-pillar">
                                    <span className="pillar-icon">{p.icon}</span>
                                    <div>
                                        <div className="pillar-title">{p.title}</div>
                                        <div className="pillar-desc">{p.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section className="land-section land-section-alt" id="features">
                <div className="land-section-inner">
                    <div className="section-label reveal">Features</div>
                    <h2 className="section-title reveal">Everything a citizen needs.</h2>
                    <p className="section-sub reveal">
                        Built end-to-end for transparency, speed, and accountability.
                    </p>
                    <div className="features-grid">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className="feature-card reveal"
                                style={{ animationDelay: `${i * 0.08}s` }}
                            >
                                <div className="feature-icon">{f.icon}</div>
                                <h3 className="feature-title">{f.title}</h3>
                                <p className="feature-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section className="land-section" id="how">
                <div className="land-section-inner">
                    <div className="section-label reveal">Process</div>
                    <h2 className="section-title reveal">How it works.</h2>
                    <p className="section-sub reveal">
                        Six steps from submission to resolution — or to court.
                    </p>
                    <div className="steps-grid">
                        {steps.map((s, i) => (
                            <div key={i} className="step-card reveal" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="step-num">{s.num}</div>
                                <h3 className="step-title">{s.title}</h3>
                                <p className="step-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="land-cta">
                <div className="land-cta-inner reveal">
                    <h2 className="cta-title">Ready to make your voice heard?</h2>
                    <p className="cta-sub">
                        Join Civic Shield. File your first complaint in under two minutes.
                    </p>
                    <div className="cta-actions">
                        <Link to="/register" className="btn-hero-primary">
                            Create Free Account
                            <span className="btn-arrow">→</span>
                        </Link>
                        <Link to="/login" className="btn-hero-outline">
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="land-footer">
                <div className="land-footer-inner">
                    <div className="land-logo">
                        <span className="land-logo-icon">🛡️</span>
                        <span className="land-logo-text">Civic Shield</span>
                    </div>
                    <p className="footer-copy">
                        © 2026 Civic Shield — Citizen Complaint Management System · Government of India
                    </p>
                    <div className="footer-links">
                        <a href="#overview">Overview</a>
                        <a href="#features">Features</a>
                        <a href="#how">How It Works</a>
                        <Link to="/login">Login</Link>
                        <Link to="/register">Register</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
