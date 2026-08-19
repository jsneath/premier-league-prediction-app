require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  const q = process.argv[2] || "";
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find(
    {
      $or: [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    },
    "username email"
  ).lean();
  console.log(
    JSON.stringify(
      users.map((u) => ({ username: u.username, email: u.email })),
      null,
      2
    )
  );
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
