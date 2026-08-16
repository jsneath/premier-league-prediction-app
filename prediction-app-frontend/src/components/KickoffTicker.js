import { useEffect, useState } from "react";
import api from "../api/axios";

function KickoffTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api
      .get("/api/fixtures/upcoming")
      .then((res) => {
        const next = (Array.isArray(res.data) ? res.data : [])
          .slice(0, 8)
          .map((f) => ({
            id: f._id,
            label: `${f.teams.home.name} vs ${f.teams.away.name}`,
            when: new Date(f.date).toLocaleString("en-GB", {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));
        setItems(next);
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  const loop = [...items, ...items];

  return (
    <div className="kickoff-ticker" aria-label="Upcoming kickoffs">
      <span className="kickoff-ticker-label">Next</span>
      <div className="kickoff-ticker-track">
        <div className="kickoff-ticker-run">
          {loop.map((item, i) => (
            <span key={`${item.id}-${i}`} className="kickoff-ticker-item">
              <strong>{item.label}</strong>
              <em>{item.when}</em>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default KickoffTicker;
