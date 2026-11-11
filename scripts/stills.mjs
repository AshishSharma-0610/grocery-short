// npm run stills : render a few key frames (half size) to out/stills so you can check the look in ~1 minute
// usage: npm run stills                 -> shot starts + the key word frames
//        npm run stills -- 36 120 250    -> just those frame numbers
import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
const w = JSON.parse(readFileSync("voice/words.json", "utf8")).words;
const fs = (i) => Math.round(w[i].s * 30);
const total = Math.ceil(JSON.parse(readFileSync("voice/words.json", "utf8")).duration * 30);
const def = [4, fs(2) + 14, fs(9) + 2, fs(13) + 6, fs(17) + 4, fs(19) + 6, fs(23) + 4, fs(24) + 4, fs(31) + 4, total - 3];
const frames = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [...new Set(def)].sort((a, b) => a - b);
mkdirSync("out/stills", { recursive: true });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
for (const f of frames) {
  console.log(`still frame ${f}`);
  const r = spawnSync(npx, ["remotion", "still", "src/index.ts", "GroceryShort", `out/stills/f${String(f).padStart(3, "0")}.png`, `--frame=${f}`, "--scale=0.5", "--gl=angle"], { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status) process.exit(r.status);
}
console.log("done: out/stills/*.png");
