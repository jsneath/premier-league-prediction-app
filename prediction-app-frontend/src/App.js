import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Fixtures from "./pages/Fixtures";
import Predictions from "./pages/Predictions";
import Login from "./pages/Login";
import Account from "./pages/Account";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Leagues from "./pages/Leagues";
import CreateLeague from "./pages/CreateLeague";
import JoinLeague from "./pages/JoinLeague";
import LeagueDetail from "./pages/LeagueDetail";
import GameweekReview from "./pages/GameweekReview";
import EmberField from "./components/EmberField";
import BroadcastRibbon from "./components/BroadcastRibbon";
import NotFound from "./pages/NotFound";

function App() {
  const location = useLocation();
  return (
    <AuthProvider>
      <div>
        <EmberField />
        <Navbar />
        <BroadcastRibbon />
        <div className="container mt-4 page-enter" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/predictions/:matchweek" element={<Predictions />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />
            <Route path="/account" element={<Account />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/leagues/create" element={<CreateLeague />} />
            <Route path="/leagues/join" element={<JoinLeague />} />
            <Route path="/leagues/:id" element={<LeagueDetail />} />
            {/* Standings live inside leagues now, so old links land there */}
            <Route path="/leaderboard" element={<Navigate to="/leagues" replace />} />
            <Route path="/gameweek/:matchweek" element={<GameweekReview />} />
            <Route path="/gameweek" element={<GameweekReview />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
