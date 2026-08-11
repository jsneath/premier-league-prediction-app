import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Account() {
  const { user, loading: authLoading, logout, updateUser, replaceToken } = useAuth();
  const navigate = useNavigate();

  // Profile form
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileMsg, setProfileMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const res = await api.patch("/api/auth/profile", {
        username: username.trim(),
        email: email.trim(),
        currentPassword: profilePassword,
      });
      updateUser(res.data.user);
      setProfilePassword("");
      setProfileMsg({ type: "success", text: res.data.message });
    } catch (err) {
      setProfileMsg({
        type: "danger",
        text: err.response?.data?.message || "Could not save your details.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "danger", text: "The two new passwords don't match." });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      if (res.data.token) replaceToken(res.data.token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "success", text: res.data.message });
    } catch (err) {
      setPasswordMsg({
        type: "danger",
        text: err.response?.data?.message || "Could not change your password.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <div className="page-header">
        <h1 className="page-title">Your Account</h1>
      </div>

      <div className="row g-3">
        {/* ── Profile ─────────────────────────────────── */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">Your Details</div>
            <div className="card-body">
              <form onSubmit={saveProfile}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="acc-username">Display name</label>
                  <input
                    id="acc-username"
                    className="form-control"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={20}
                    autoComplete="username"
                  />
                  <div className="form-hint">
                    This is how you appear on the league table. 3–20 characters,
                    letters, numbers, - and _ only.
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="acc-email">Email</label>
                  <input
                    id="acc-email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="acc-confirm">Current password</label>
                  <input
                    id="acc-confirm"
                    type="password"
                    className="form-control"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Confirm it's you"
                  />
                </div>

                {profileMsg && (
                  <div className={`alert alert-${profileMsg.type} py-2`}>{profileMsg.text}</div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={savingProfile || !profilePassword}
                >
                  {savingProfile ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                  ) : (
                    "Save Details"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Password ────────────────────────────────── */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header">Change Password</div>
            <div className="card-body">
              <form onSubmit={savePassword}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="pw-current">Current password</label>
                  <input
                    id="pw-current"
                    type="password"
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="pw-new">New password</label>
                  <input
                    id="pw-new"
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <div className="form-hint">At least 8 characters.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="pw-confirm">Confirm new password</label>
                  <input
                    id="pw-confirm"
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                {passwordMsg && (
                  <div className={`alert alert-${passwordMsg.type} py-2`}>{passwordMsg.text}</div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                >
                  {savingPassword ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-body d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div className="fw-bold">Signed in as {user.username}</div>
            <div className="text-muted small">
              Finished for now? You'll stay signed in on this device for a week.
            </div>
          </div>
          <div className="d-flex gap-2">
            <Link to="/leagues" className="btn btn-outline-secondary btn-sm">My Leagues</Link>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => { logout(); navigate("/login"); }}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;
