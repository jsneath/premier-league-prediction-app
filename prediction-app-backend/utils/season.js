// Single place the "current season" is defined. API-Football identifies a
// season by its starting year: 2026 = the 2026/27 season.
const CURRENT_SEASON = parseInt(process.env.API_FOOTBALL_SEASON || "2026", 10);

// 2026 -> "2026/27"
function seasonLabel(season) {
  return `${season}/${String(season + 1).slice(2)}`;
}

module.exports = { CURRENT_SEASON, seasonLabel };
