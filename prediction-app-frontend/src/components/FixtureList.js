function FixtureList({ fixtures }) {
  return (
    <div>
      {fixtures.length === 0 ? (
        <p>No upcoming fixtures available.</p>
      ) : (
        <ul className="list-group">
          {fixtures.map((fixture) => (
            <li key={fixture.id} className="list-group-item">
              <strong>{fixture.teams.home.name}</strong> vs{" "}
              <strong>{fixture.teams.away.name}</strong>
              <br />
              Date: {new Date(fixture.date).toLocaleString()}
              <br />
              Venue: {fixture.venue.name}, {fixture.venue.city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FixtureList;
