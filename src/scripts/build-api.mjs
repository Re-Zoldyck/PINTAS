// Membundel kode server (src/endpoints + helpers) menjadi satu file ESM: server/handler.bundle.mjs.
// Paket npm tetap "external" (dipasang Vercel dari package.json); hanya kode di repo yang digabung,
// sehingga impor relatif tanpa ekstensi (mis. "../helpers/db") aman dijalankan Node ESM.
// Jalankan ulang setelah mengubah kode di src/endpoints atau src/helpers:  npm run build:api
import { build } from "esbuild";

await build({
  entryPoints: ["server/handler.ts"],
  outfile: "server/handler.bundle.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  packages: "external",
  logLevel: "info",
});
