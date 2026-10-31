import { Link } from "react-router-dom";
import { getAuthToken } from "../api/client";
import { Logo } from "../components/Logo";

export function LandingPage() {
  const isAuthenticated = Boolean(getAuthToken());

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container nav-container">
          <div className="brand">
            <Logo height={34} alt="PayDoo" />
          </div>
          <nav className="landing-nav">
            {isAuthenticated ? (
              <Link to="/dashboard" className="button">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="button secondary">
                  Sign In
                </Link>
                <Link to="/login?mode=register" className="button">
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-container hero-grid">
            <div className="hero-content">
              <span className="eyebrow">Enterprise Subscription Billing</span>
              <h1>Unified Subscription Management & Instant Invoicing</h1>
              <p>
                Pay-Doo streamlines recurring billing, customer accounts, multi-variant products, automated renewal cycles, and compliant PDF invoices for the Brightloop ecosystem.
              </p>
              <div className="hero-actions">
                <Link to={isAuthenticated ? "/dashboard" : "/login?mode=register"} className="button hero-cta">
                  {isAuthenticated ? "Open Workspace" : "Get Started Now"}
                </Link>
                <Link to={isAuthenticated ? "/invoices" : "/login"} className="button secondary hero-secondary">
                  {isAuthenticated ? "View Invoices" : "Sign In"}
                </Link>
              </div>
            </div>

            {/* Placeholder for future branding / illustration */}
            <div className="hero-illustration-placeholder">
              <div className="placeholder-box">
                <div className="placeholder-badge">Pay-Doo Engine</div>
                <div className="placeholder-mockup">
                  <div className="mock-bar" />
                  <div className="mock-line wide" />
                  <div className="mock-line medium" />
                  <div className="mock-cards">
                    <div className="mock-card">Subscriptions</div>
                    <div className="mock-card">Invoices (PDF)</div>
                    <div className="mock-card">Live Payments</div>
                  </div>
                </div>
                <span className="placeholder-caption">[ Future Hero Graphic & Interactive Preview ]</span>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="landing-features">
          <div className="landing-container">
            <div className="section-head">
              <span className="eyebrow">Platform Capabilities</span>
              <h2>Engineered for Accurate Recurring Revenue</h2>
              <p>Everything your finance and operations teams require to orchestrate lifecycle billing.</p>
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Automated Billing Runs</h3>
                <p>Generate period-bounded invoices for active subscriptions with strict interval verification and automated proration.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">📄</div>
                <h3>Instant PDF Invoices</h3>
                <p>Download production-grade PDF invoices complete with customer billing details, line-item breakdowns, and payment history.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🛡️</div>
                <h3>Role-Based Security</h3>
                <p>Enforced multi-tenant isolation ensuring customers only access their own records while staff and administrators oversee operations.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">💳</div>
                <h3>Split & Balance Payments</h3>
                <p>Real-time payment allocation with strict balance ceilings, multi-rail support (UPI, Bank, Card, Cash), and immediate status updates.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container footer-content">
          <p>© 2026 Pay-Doo by Brightloop Software. Odoo Hackathon Edition.</p>
          <div className="footer-links">
            <Link to="/login">Portal Login</Link>
            <a href="/docs" target="_blank" rel="noreferrer">API Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}