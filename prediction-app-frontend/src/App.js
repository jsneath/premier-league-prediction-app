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
          <Route path="/predictions" element={<Predictions />} />{" "}
          {/* Line 19 */}
        </Routes>
      </div>
    </div>
  );
}

export default App;
