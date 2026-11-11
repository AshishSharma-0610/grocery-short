// npm run check : verify picture and sound have the same length as the voice-over (sync check)
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
const file = process.argv[2] ?? "out/final.mp4";
if (!existsSync(file)) { console.error(`missing ${file}: run npm run mux first`); process.exit(1); }
const words = JSON.parse(readFileSync("voice/words.json", "utf8"));
const frames = Math.ceil(words.duration * 30), dur = frames / 30;
const probe = (sel, ent) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", sel, "-count_frames", "-show_entries", ent, "-of", "json", file]).toString()).streams[0];
const v = probe("v:0", "stream=width,height,r_frame_rate,nb_read_frames,duration");
const a = probe("a:0", "stream=codec_name,sample_rate,channels,duration");
const vd = parseFloat(v.duration), ad = parseFloat(a.duration), nf = parseInt(v.nb_read_frames);
const ok = (c) => (c ? "OK  " : "FAIL");
console.log(`${ok(nf === frames)} video frames ${nf} (expected ${frames})   ${v.width}x${v.height} @ ${v.r_frame_rate}`);
console.log(`${ok(Math.abs(vd - dur) < 0.04)} video duration ${vd.toFixed(3)} s (expected ${dur.toFixed(3)})`);
console.log(`${ok(Math.abs(ad - dur) < 0.05)} audio duration ${ad.toFixed(3)} s (${a.codec_name} ${a.sample_rate} Hz, ${a.channels} ch)`);
console.log(`${ok(Math.abs(ad - vd) < 0.05)} audio/video offset at the end: ${(ad - vd).toFixed(3)} s`);
if (nf !== frames || Math.abs(ad - vd) >= 0.05) process.exit(2);
