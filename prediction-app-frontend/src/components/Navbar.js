import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const close = () => setExpanded(false);
  const isActive = (path) => location.pathname.startsWith(path) ? "active" : "";

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand" to="/" onClick={close}>
          <span className="brand-icon">⚽</span>
          PL Predictions
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${expanded ? "show" : ""}`}>
          <ul className="navbar-nav me-auto gap-1">
            <li className="nav-item">
              <Link className={`nav-link ${isActive("/fixtures")}`} to="/fixtures" onClick={close}>
                Fixtures
              </Link>
            </li>
            {user && (
              <li className="nav-item">
                <Link className={`nav-link ${isActive("/gameweek")}`} to="/gameweek" onClick={close}>
                  Results
                </Link>
              </li>
            )}
            <li className="nav-item">
              <Link className={`nav-link ${isActive("/leaderboard")}`} to="/leaderboard" onClick={close}>
                Leaderboard
              </Link>
            </li>
            {user && (
              <li className="nav-item">
                <Link className={`nav-link ${isActive("/leagues")}`} to="/leagues" onClick={close}>
                  Leagues
                </Link>
              </li>
            )}
          </ul>

          <ul className="navbar-nav ms-auto align-items-lg-center gap-1">
            {user ? (
              <>
                <li className="nav-item">
                  <span className="nav-link" style={{ color: "#a78bfa", fontSize: "0.85rem", fontWeight: 600 }}>
                    👤 {user.username}
                  </span>
                </li>
                <li className="nav-item">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => { logout(); close(); }}
                    style={{ fontSize: "0.8rem" }}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <Link className="nav-link" to="/login" onClick={close}>
                  Login
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
