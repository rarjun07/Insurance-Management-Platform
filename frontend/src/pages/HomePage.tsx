import { ArrowRight, ClipboardCheck, FileText, ShieldCheck, Users } from "lucide-react";
import { ComingSoonCard } from "../components/ComingSoonCard";
import { policyTypes } from "../data/mockData";

type HomePageProps = {
  onLogin: () => void;
  onRegister: () => void;
};

export function HomePage({ onLogin, onRegister }: HomePageProps) {
  return (
    <main className="home-page">
      <nav className="home-nav">
        <div className="brand compact">
          <div className="brand-mark">H</div>
          <div>
            <p className="brand-title">HealthInsure</p>
            <p className="brand-subtitle">Digital insurance platform</p>
          </div>
        </div>
        <div className="home-nav-actions">
          <button className="secondary-button" onClick={onLogin}>
            Login
          </button>
          <button className="primary-button" onClick={onRegister}>
            Register
          </button>
        </div>
      </nav>

      <section className="home-hero">
        <div>
          <p className="eyebrow">Health Insurance Management</p>
          <h1>Modern insurance operations for customers, agents, and admins.</h1>
          <p>
            A role-based web platform to manage health policies, premium payments, claim
            verification, customer documents, and reports.
          </p>
          <div className="home-cta-row">
            <button className="primary-button" onClick={onRegister}>
              Create account
              <ArrowRight size={18} />
            </button>
            <button className="secondary-button" onClick={onLogin}>
              Login to dashboard
            </button>
          </div>
        </div>
        <div className="home-hero-card">
          <div className="home-card-header">
            <span>Live workspace preview</span>
            <span className="status-dot" />
          </div>
          <div className="home-mini-grid">
            <div>
              <strong>85</strong>
              <span>Active Policies</span>
            </div>
            <div>
              <strong>14</strong>
              <span>Pending Claims</span>
            </div>
            <div>
              <strong>₹2.4L</strong>
              <span>Premiums</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Platform modules</p>
            <h2>Everything needed for daily insurance work</h2>
          </div>
        </div>
        <div className="feature-grid">
          <FeatureCard icon={Users} title="Customer Management" text="Maintain customer profiles, history, and contact data." />
          <FeatureCard icon={ShieldCheck} title="Health Policies" text="Create, renew, cancel, and monitor health policies." />
          <FeatureCard icon={ClipboardCheck} title="Claims Workflow" text="Submit, review, approve, or reject claims." />
          <FeatureCard icon={FileText} title="Documents" text="Upload identity, policy, and claim documents." />
        </div>
      </section>

      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Insurance catalog</p>
            <h2>Focused scope with future expansion</h2>
          </div>
        </div>
        <div className="policy-type-grid">
          {policyTypes.map((policy) => (
            <ComingSoonCard key={policy.title} {...policy} />
          ))}
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Users;
  title: string;
  text: string;
}) {
  return (
    <article className="feature-card">
      <div className="stat-icon">
        <Icon size={22} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}
