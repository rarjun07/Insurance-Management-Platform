import { useState } from "react";
import type { AppUser, UserRole } from "../types";

type RegisterPageProps = {
  userCount: number;
  onBackHome: () => void;
  onGoLogin: () => void;
  onRegister: (user: AppUser) => void;
  onLogin: (user: AppUser) => void;
};

export function RegisterPage({
  userCount,
  onBackHome,
  onGoLogin,
  onRegister,
  onLogin,
}: RegisterPageProps) {
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    role: "Customer" as UserRole,
  });

  function submitRegister() {
    const user: AppUser = {
      id: `USR-${String(userCount + 1).padStart(3, "0")}`,
      name: registerForm.name || "New Customer",
      email: registerForm.email || `new${userCount + 1}@example.com`,
      role: registerForm.role,
      department: registerForm.role === "Customer" ? "Customer Portal" : "Operations",
      customerId: registerForm.role === "Customer" ? "CUS-001" : undefined,
    };
    onRegister(user);
    onLogin(user);
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand-mark large">H</div>
        <p className="eyebrow">Account Registration</p>
        <h1>Create your secure insurance account.</h1>
        <p>Choose the correct role so the platform can show the right dashboard and permissions.</p>
      </section>

      <section className="auth-card">
        <button className="text-button" onClick={onBackHome}>
          Back to home
        </button>
        <div className="auth-form">
          <h2>Register</h2>
          <label>
            Full name
            <input
              value={registerForm.name}
              onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
              placeholder="Enter full name"
            />
          </label>
          <label>
            Email
            <input
              value={registerForm.email}
              onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
              placeholder="name@example.com"
            />
          </label>
          <label>
            Role
            <select
              value={registerForm.role}
              onChange={(event) =>
                setRegisterForm({ ...registerForm, role: event.target.value as UserRole })
              }
            >
              <option>Customer</option>
              <option>Insurance Agent</option>
              <option>Admin</option>
            </select>
          </label>
          <button className="primary-button full-width" onClick={submitRegister}>
            Register and Login
          </button>
          <p className="form-note">Already registered? <button className="inline-link" onClick={onGoLogin}>Login here</button></p>
        </div>
      </section>
    </main>
  );
}
