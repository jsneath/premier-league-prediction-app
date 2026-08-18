// Usernames are matched case-insensitively. Display casing is left as stored.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function usernameFilter(username) {
  return { username: { $regex: `^${escapeRegex(username.trim())}$`, $options: "i" } };
}

function sameUsername(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

module.exports = { usernameFilter, sameUsername };
