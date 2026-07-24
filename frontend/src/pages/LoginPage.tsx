import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { AppUser } from "../types";

type LoginPageProps = {
  users: AppUser[];
  onBackHome: () => void;
  onGoRegister: () => void;
  onLogin: (user: AppUser) => void;
};

export function LoginPage({ users, onBackHome, onGoRegister, onLogin }: LoginPageProps) {
  const [selectedEmail, setSelectedEmail] = useState(users[0]?.email ?? "");

  function submitLogin() {
    const user = users.find((item) => item.email === selectedEmail);
    if (user) {
      onLogin(user);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand-mark large">H</div>
        <p className="eyebrow">Secure Login</p>
        <h1>Access your insurance workspace.</h1>
        <p>Login as Admin, Insurance Agent, or Customer to see role-specific dashboards.</p>
      </section>

      <section className="auth-card">
        <button className="text-button" onClick={onBackHome}>
          Back to home
        </button>
        <div className="auth-form">
          <ShieldCheck size={36} />
          <h2>Login</h2>
          <label>
            Demo account
            <select value={selectedEmail} onChange={(event) => setSelectedEmail(event.target.value)}>
              {users.map((user) => (
                <option key={user.id} value={user.email}>
                  {user.role} - {user.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Password
            <input value="password123" readOnly />
          </label>
          <button className="primary-button full-width" onClick={submitLogin}>
            Login
          </button>
          <p className="form-note">New user? <button className="inline-link" onClick={onGoRegister}>Create an account</button></p>
        </div>
      </section>
    </main>
  );
}
