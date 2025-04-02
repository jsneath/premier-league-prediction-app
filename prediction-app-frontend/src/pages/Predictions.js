import React, { useState, useEffect } from "react";
import FixtureList from "../components/FixtureList";

function Predictions() {
  const [fixtures, setFixtures] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/fixtures?status=NS")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Fetched fixtures:", data); // Debug the data
        setFixtures(data); // Update to handle the array directly
      })
      .catch((err) => {
        console.error("Error fetching fixtures:", err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Upcoming Fixtures</h1>
      <FixtureList fixtures={fixtures} />
    </div>
  );
}

export default Predictions;
