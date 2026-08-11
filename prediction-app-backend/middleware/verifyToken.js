const jwt = require("jsonwebtoken");

// The `code` below is what tells the frontend "your session is genuinely no
// longer valid, sign in again". Other 401s — such as getting your current
// password wrong on the account page — deliberately do NOT carry it, so they
// surface as an ordinary form error instead of booting you out.
module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "No token provided", code: "token_invalid" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Invalid or expired token", code: "token_invalid" });
  }
};
