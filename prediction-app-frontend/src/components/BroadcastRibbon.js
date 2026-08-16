import { useEffect, useState } from "react";
import api from "../api/axios";

function BroadcastRibbon() {
  const [line, setLine] = useState("PL Predictions · Call the scores · Settle it later");

  useEffect(() => {
    api
      .get("/api/fixtures/current")
      .then((res) => {
        const gw = res.data?.matchweek;
        const season = res.data?.seasonLabel;
        if (gw) {
          setLine(
            `Season ${season || ""} · Gameweek ${gw} of 38 · Locks one hour before kickoff · Double points on one match · Exact score is three · Correct result is one`
          );
        }
      })
      .catch(() => {});
  }, []);

  const loop = `${line}   ◆   ${line}   ◆   `;

  return (
    <div className="broadcast-ribbon" aria-hidden>
      <div className="broadcast-ribbon-run">{loop}{loop}</div>
    </div>
  );
}

export default BroadcastRibbon;
