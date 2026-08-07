const League = require("../models/League");

// Everyone who shares at least one league with this user (always includes
// the user themselves). Used to keep scores and predictions from leaking
// between separate groups of friends.
async function leagueMateIds(userId) {
  const leagues = await League.find({ "members.userId": userId }).select("members");
  const ids = new Set([String(userId)]);
  for (const league of leagues) {
    for (const member of league.members) {
      if (member.userId) ids.add(String(member.userId));
    }
  }
  return [...ids];
}

// Throws-free membership check: returns the league if the user is in it,
// otherwise null.
async function getLeagueIfMember(leagueId, userId) {
  let league;
  try {
    league = await League.findById(leagueId);
  } catch {
    return null; // malformed id
  }
  if (!league) return null;
  const isMember = league.members.some((m) => String(m.userId) === String(userId));
  return isMember ? league : null;
}

module.exports = { leagueMateIds, getLeagueIfMember };
