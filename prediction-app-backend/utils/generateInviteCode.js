const League = require("../models/League");

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

async function generateInviteCode() {
  let code;
  let exists = true;
  while (exists) {
    code = randomCode();
    exists = await League.findOne({ inviteCode: code });
  }
  return code;
}

module.exports = generateInviteCode;
