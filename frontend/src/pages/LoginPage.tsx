import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setSuccess('Account created! Check your email to confirm.');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Quick Knowledge</h1>
          <p className="login-subtitle">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-alert login-alert-error">{error}</div>
          )}
          {success && (
            <div className="login-alert login-alert-success">{success}</div>
          )}

          <div className="login-field">
            <label htmlFor="email" className="login-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password" className="login-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="login-input"
              placeholder="••••••••"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading
              ? 'Please wait…'
              : isSignUp
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        <div className="login-switch">
          <span className="login-switch-text">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
            className="login-switch-button"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>

      <style>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-surface, #0a0a0a);
          padding: 1.5rem;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          background: var(--bg-surface-container, #1a1a1a);
          border: 1px solid var(--border-outline, rgba(255,255,255,0.08));
          border-radius: 1.5rem;
          padding: 2.5rem;
        }
        .login-header { text-align: center; margin-bottom: 2rem; }
        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary, #f0f0f0);
          margin: 0 0 0.5rem;
        }
        .login-subtitle {
          color: var(--text-secondary, #888);
          font-size: 0.875rem;
          margin: 0;
        }
        .login-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .login-field { display: flex; flex-direction: column; gap: 0.375rem; }
        .login-label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-secondary, #aaa);
        }
        .login-input {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid var(--border-outline, rgba(255,255,255,0.1));
          background: var(--bg-surface, #0d0d0d);
          color: var(--text-primary, #f0f0f0);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .login-input:focus {
          border-color: var(--accent, #6366f1);
        }
        .login-input::placeholder { color: var(--text-tertiary, #555); }
        .login-button {
          padding: 0.75rem;
          border-radius: 0.75rem;
          border: none;
          background: var(--accent, #6366f1);
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: opacity 0.2s;
          margin-top: 0.5rem;
        }
        .login-button:hover { opacity: 0.9; }
        .login-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-switch {
          text-align: center;
          margin-top: 1.5rem;
        }
        .login-switch-text {
          font-size: 0.8125rem;
          color: var(--text-secondary, #888);
        }
        .login-switch-button {
          background: none;
          border: none;
          color: var(--accent, #6366f1);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          margin-left: 0.25rem;
        }
        .login-switch-button:hover { text-decoration: underline; }
        .login-alert {
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.8125rem;
        }
        .login-alert-error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .login-alert-success {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
      `}</style>
    </div>
  );
}
