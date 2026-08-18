const { usernameFilter, sameUsername } = require("../utils/username");

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}` +
    (ok ? "" : `\n          got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`));
}

console.log("\n--- Case-insensitive usernames ---");
check("same name, different case", sameUsername("danjedd27", "DanJedd27"), true);
check("different names", sameUsername("danjedd27", "someoneelse"), false);
check("trims on filter", usernameFilter("  Dan_27  ").username.$regex, "^Dan_27$");
check("escapes regex metacharacters", usernameFilter("a.b").username.$regex, "^a\\.b$");
check("lookup is case-insensitive", usernameFilter("Dan").username.$options, "i");

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
