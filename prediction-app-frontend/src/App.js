import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Fixtures from "./pages/Fixtures";
import Predictions from "./pages/Predictions";
import Login from "./pages/Login";
import LeaderboardPage from "./pages/LeaderboardPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Leagues from "./pages/Leagues";
import CreateLeague from "./pages/CreateLeague";
import JoinLeague from "./pages/JoinLeague";
import LeagueDetail from "./pages/LeagueDetail";

function App() {
  return (
    <AuthProvider>
      <div>
        <Navbar />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/predictions/:matchweek" element={<Predictions />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/leagues/create" element={<CreateLeague />} />
            <Route path="/leagues/join" element={<JoinLeague />} />
            <Route path="/leagues/:id" element={<LeagueDetail />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="*" element={<div>404 Not Found</div>} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
