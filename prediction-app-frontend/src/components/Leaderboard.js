function RankBadge({ rank }) {
  if (rank === 1) return <span className="rank-badge rank-1">🥇</span>;
  if (rank === 2) return <span className="rank-badge rank-2">🥈</span>;
  if (rank === 3) return <span className="rank-badge rank-3">🥉</span>;
  return <span className="rank-badge rank-other">{rank}</span>;
}

function Leaderboard({ scores, currentUserId }) {
  if (!scores || scores.length === 0) {
    return <p className="text-muted mb-0">No players yet.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0">
        <thead className="table-dark">
          <tr>
            <th style={{ width: "48px" }}>Rank</th>
            <th>Player</th>
            <th className="text-end">Points</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((entry, idx) => {
            const isMe = entry._id === currentUserId;
            return (
              <tr key={entry._id}>
                <td><RankBadge rank={idx + 1} /></td>
                <td>
                  <span className={isMe ? "fw-bold" : ""}>{entry.username}</span>
                  {isMe && <span className="ms-2 badge bg-secondary" style={{ fontSize: "0.65rem" }}>you</span>}
                </td>
                <td className="text-end">
                  <span
                    className="fw-bold"
                    style={{
                      color: idx === 0 ? "var(--gold)" : idx === 1 ? "#94a3b8" : idx === 2 ? "#cd7c3a" : "var(--text)",
                      fontFamily: "Oswald, sans-serif",
                      fontSize: "1rem",
                    }}
                  >
                    {entry.totalPoints}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginLeft: "2px" }}>pts</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
