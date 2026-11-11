// npm run mux : put the soundtrack under the silent render with the EXACT frame-count duration (no drift, no re-encode of the picture)
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
const words = JSON.parse(readFileSync("voice/words.json", "utf8"));
const frames = Math.ceil(words.duration * 30), dur = (frames / 30).toFixed(3);
const video = process.argv[2] ?? "out/video_silent.mp4", audio = process.argv[3] ?? "audio/out/mix.wav", out = process.argv[4] ?? "out/final.mp4";
for (const f of [video, audio]) if (!existsSync(f)) { console.error(`missing ${f}. Run npm run render (video) and npm run sync (audio) first.`); process.exit(1); }
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-t", dur, "-movflags", "+faststart", out], { stdio: "inherit" });
console.log(`wrote ${out}  (${frames} frames, ${dur} s, audio ${audio})`);
