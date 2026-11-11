// Cross-platform Python launcher: node scripts/py.mjs <script.py> [args...]   (tries python3, python, then the Windows "py -3")
import { spawnSync } from "node:child_process";
const args = process.argv.slice(2);
for (const [cmd, pre] of [["python3", []], ["python", []], ["py", ["-3"]]]) {
  const r = spawnSync(cmd, [...pre, ...args], { stdio: "inherit" });
  if (r.error && r.error.code === "ENOENT") continue;
  process.exit(r.status ?? 1);
}
console.error("Python 3 was not found. Install it from python.org (tick 'Add to PATH'), then: pip install -r requirements.txt");
process.exit(1);
