// Single place the "current season" is defined. API-Football identifies a
// season by its starting year: 2026 = the 2026/27 season.
const CURRENT_SEASON = parseInt(process.env.API_FOOTBALL_SEASON || "2026", 10);

// 2026 -> "2026/27"
function seasonLabel(season) {
  return `${season}/${String(season + 1).slice(2)}`;
}

// Which season was running on a given date. A Premier League season is named
// after the year it kicks off in and runs August to May, so anything from July
// onwards belongs to that year's season. Used to work out how far back a
// league's history can legitimately go — a league created this August has no
// business showing last season's table.
function seasonForDate(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return CURRENT_SEASON;
  return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

module.exports = { CURRENT_SEASON, seasonLabel, seasonForDate };
