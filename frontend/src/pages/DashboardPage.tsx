import { AlertTriangle, CheckCircle2, Clock, IndianRupee, Users } from "lucide-react";
import { ComingSoonCard } from "../components/ComingSoonCard";
import { StatCard } from "../components/StatCard";

const policyTypes = [
  { title: "Health Insurance", status: "Available", active: true },
  { title: "Vehicle Insurance", status: "Coming Soon" },
  { title: "Life Insurance", status: "Coming Soon" },
  { title: "Travel Insurance", status: "Coming Soon" },
  { title: "Property Insurance", status: "Coming Soon" },
];

export function DashboardPage() {
  return (
    <div className="dashboard-grid">
      <section className="stats-grid">
        <StatCard icon={Users} label="Customers" value="120" trend="+8 this month" />
        <StatCard icon={CheckCircle2} label="Active Policies" value="85" trend="Health plans" />
        <StatCard icon={Clock} label="Pending Claims" value="14" trend="Needs review" />
        <StatCard icon={IndianRupee} label="Premium Collection" value="₹2.4L" trend="Paid premiums" />
      </section>

      <section className="panel wide-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Version One</p>
            <h2>Insurance Types</h2>
          </div>
          <span className="badge">Health Insurance Focus</span>
        </div>

        <div className="policy-type-grid">
          {policyTypes.map((policy) => (
            <ComingSoonCard key={policy.title} {...policy} />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Claim Status</h2>
          <AlertTriangle size={20} />
        </div>
        <div className="chart-placeholder">
          <div className="chart-bar approved" />
          <div className="chart-bar pending" />
          <div className="chart-bar rejected" />
        </div>
        <div className="legend">
          <span>Approved</span>
          <span>Pending</span>
          <span>Rejected</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Recent Activity</h2>
        </div>
        <div className="activity-list">
          <p>New customer profile created</p>
          <p>Health policy renewed</p>
          <p>Premium marked as paid</p>
          <p>Claim moved to pending review</p>
        </div>
      </section>
    </div>
  );
}
