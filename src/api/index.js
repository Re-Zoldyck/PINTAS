// Pembungkus tipis: memuat bundle server (server/handler.bundle.mjs) secara dinamis supaya
// kesalahan inisialisasi (mis. env var belum diisi) tampil sebagai pesan JSON, bukan crash 500 kosong.
export default async function handler(req, res) {
  let mod;
  try {
    mod = await import("../server/handler.bundle.mjs");
  } catch (error) {
    console.error("Gagal memuat server:", error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ json: { error: "Server gagal dimulai: " + String((error && error.message) || error) } }));
    return;
  }
  return mod.default(req, res);
}
