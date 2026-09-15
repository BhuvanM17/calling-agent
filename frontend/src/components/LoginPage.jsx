import React, { useState } from "react";
import api from "../services/api";
import "./LoginPage.css";

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await api.login({
        email: email.trim(),
        password: password.trim(),
      });

      if (res?.token) {
        if (onLoginSuccess) {
          onLoginSuccess(res.user, res.token);
        }
      } else {
        setErrorMessage("Authentication failed: No token received.");
      }
    } catch (err) {
      setErrorMessage(
        err?.message || "Invalid credentials or unable to reach authentication server."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (fillEmail, fillPass) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setErrorMessage("");
  };

  return (
    <div className="login-page-container">
      {/* Background ambient lighting */}
      <div className="login-bg-glow login-bg-glow-1" />
      <div className="login-bg-glow login-bg-glow-2" />

      <div className="login-card">
        {/* Header / Brand */}
        <div className="login-brand">
          <div className="login-logo-badge">
            <span className="material-symbols-outlined login-logo-icon">smart_toy</span>
          </div>
          <h1 className="login-title">BizzHub Calling Agent</h1>
          <p className="login-subtitle">Sign in to access voice dashboard & AI call logs</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-error-alert" role="alert">
            <span className="material-symbols-outlined login-error-icon">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label htmlFor="email" className="login-label">
              Work Email
            </label>
            <div className="login-input-wrapper">
              <span className="material-symbols-outlined login-input-icon">mail</span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@bizzhub.com"
                required
                autoComplete="email"
                className="login-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="login-form-group">
            <div className="login-label-row">
              <label htmlFor="password" className="login-label">
                Password
              </label>
            </div>
            <div className="login-input-wrapper">
              <span className="material-symbols-outlined login-input-icon">lock</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="login-input"
                disabled={loading}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`login-submit-btn ${loading ? "loading" : ""}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined spin-icon">progress_activity</span>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Credentials Helper for Development/Testing */}
        <div className="login-quick-helper">
          <span className="quick-helper-title">Testing with existing accounts?</span>
          <div className="quick-helper-chips">
            <button
              type="button"
              className="quick-chip"
              onClick={() => handleQuickFill("sharathkumar3113@gmail.com", "Password@123")}
              title="Click to fill email"
            >
              <span className="chip-role">Admin</span>
              <span className="chip-email">sharathkumar3113...</span>
            </button>
            <button
              type="button"
              className="quick-chip"
              onClick={() => handleQuickFill("sharathkumara@bizzhubworkspaces.com", "Password@123")}
              title="Click to fill email"
            >
              <span className="chip-role">Location Admin</span>
              <span className="chip-email">sharathkumara...</span>
            </button>
          </div>
        </div>

        {/* Security badge */}
        <div className="login-footer-security">
          <span className="material-symbols-outlined security-icon">verified_user</span>
          <span>Secured via BizzHub HS256 JWT Single Sign-On</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
