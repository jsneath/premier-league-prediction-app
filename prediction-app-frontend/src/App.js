import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Fixtures from "./pages/Fixtures";
import Predictions from "./pages/Predictions";

function App() {
  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<Home />} /> {/* Line 17 */}
          <Route path="/fixtures" element={<Fixtures />} /> {/* Line 18 */}
          <Route
            path="/predictions/:matchweek"
            element={<Predictions />}
          />{" "}
          {/* New: Dynamic param */}
          {/* Other routes like /home, /leaderboard */}
          <Route path="*" element={<div>404 Not Found</div>} />{" "}
          {/* Optional: Catch-all */}
          {/* Line 19 */}
        </Routes>
        {/* <button
          onClick={() => localStorage.setItem("token", "mock_token_for_dev")}
        >
          Dev Login
        </button> */}
      </div>
    </div>
  );
}

export default App;
