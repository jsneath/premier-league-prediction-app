import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const [activeTab, setActiveTab] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "true";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(username, password);
      navigate("/fixtures");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.msg || "Login failed");
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(username, email, password);
      navigate("/fixtures");
    } catch (err) {
      const data = err.response?.data;
      setError(data?.msg || data?.message || data?.errors?.[0]?.msg || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <span className="auth-logo-icon">⚽</span>
        <span className="auth-logo-title">PL Predictions</span>
      </div>

      <div className="card">
        <div className="card-body p-4">
          {sessionExpired && (
            <div className="alert alert-warning mb-3">Your session has expired. Please log in again.</div>
          )}

          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "login" ? "active" : ""}`}
                onClick={() => { setActiveTab("login"); setError(""); }}
              >Login</button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === "register" ? "active" : ""}`}
                onClick={() => { setActiveTab("register"); setError(""); }}
              >Register</button>
            </li>
          </ul>

          {error && <div className="alert alert-danger">{error}</div>}

          {activeTab === "login" ? (
            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input type="text" className="form-control" value={username}
                  onChange={(e) => setUsername(e.target.value)} required autoFocus />
              </div>
              <div className="mb-4">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary w-100 btn-lg" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Logging in…</> : "Login"}
              </button>
              <div className="text-center mt-3">
                <Link to="/forgot-password" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Forgot password?
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input type="text" className="form-control" value={username}
                  onChange={(e) => setUsername(e.target.value)} required minLength={3} autoFocus />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="mb-4">
                <label className="form-label">Password</label>
                <input type="password" className="form-control" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <button type="submit" className="btn btn-success w-100 btn-lg" disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Registering…</> : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
