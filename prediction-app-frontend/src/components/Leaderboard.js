function Leaderboard({ scores, currentUserId }) {
  if (!scores || scores.length === 0) {
    return <p className="text-muted">No scores yet.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-hover">
        <thead className="table-dark">
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((entry, idx) => (
            <tr
              key={entry._id}
              className={
                entry._id === currentUserId ? "table-warning fw-bold" : ""
              }
            >
              <td>{idx + 1}</td>
              <td>{entry.username}</td>
              <td>{entry.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
