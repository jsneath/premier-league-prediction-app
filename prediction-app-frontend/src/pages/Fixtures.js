import { useState, useEffect } from "react";
import FixtureList from "../components/FixtureList";

function Fixtures() {
  const [fixtures, setFixtures] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/fixtures")
      .then((res) => res.json())
      .then((data) => setFixtures(data))
      .catch((err) => console.error("Error fetching fixtures:", err));
  }, []);

  return (
    <div>
      <h1>Premier League Fixtures</h1>
      <FixtureList fixtures={fixtures} />
    </div>
  );
}

export default Fixtures;
