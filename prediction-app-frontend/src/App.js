import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Fixtures from "./pages/Fixtures";
import Predictions from "./pages/Predictions";
import Login from "./pages/Login";
import LeaderboardPage from "./pages/LeaderboardPage";

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
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="*" element={<div>404 Not Found</div>} />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
