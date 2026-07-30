# SatoruStream

Frontend streaming anime berbahasa Indonesia: React + TypeScript + Vite, Tailwind CSS,
React Router, dan Supabase untuk fitur akun. Datanya diambil dari **superanime** — API
scraper terpisah yang harus jalan lebih dulu; SatoruStream sendiri tidak melakukan
scraping.

Satu antarmuka, empat sumber scraper yang bisa ditukar kapan saja lewat pemilih
"Sumber" di header. Menu yang tidak didukung sumber aktif otomatis disembunyikan.

## Fitur

- **Jelajah** — beranda (ongoing + completed), daftar ongoing berhalaman, jadwal rilis
  per hari, katalog A-Z, daftar genre, dan pencarian.
- **Tonton** — pemutar iframe dengan pilihan server/mirror, pilihan resolusi
  (360p/480p/720p), navigasi episode sebelumnya/berikutnya, dan tautan unduhan
  mp4/mkv sebagai cadangan saat server streaming bermasalah.
- **Akun** — daftar/masuk lewat Supabase Auth (email + password).
- **Wishlist & riwayat tontonan** — terikat akun, tersimpan di Supabase dengan RLS.
- **Tema terang/gelap** — disimpan per perangkat.
- **PWA** — bisa dipasang, punya halaman offline, dan cache aset build.
- **SEO** — meta statis di `index.html`, meta per halaman saat runtime, plus
  `robots.txt` dan `sitemap.xml` yang dibuat otomatis saat build.

## Menjalankan

Prasyarat: Node.js 20+ dan server API superanime yang sudah jalan.

```bash
# 1. superanime lebih dulu (di folder terpisah)
cd ../SuperAnime && bun dev        # default: http://localhost:3001

# 2. SatoruStream
npm install
cp .env.example .env.development   # lalu isi variabelnya
npm run dev                        # http://localhost:5173
```

Skrip lain:

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Dev server Vite dengan HMR. |
| `npm run build` | `tsc -b` -> `vite build` -> buat `robots.txt` + `sitemap.xml`. |
| `npm run preview` | Menyajikan `dist/`. Wajib dipakai untuk menguji PWA. |
| `npm run lint` | ESLint untuk seluruh proyek. |

## Konfigurasi environment

Vite memuat `.env.development` saat `npm run dev` dan `.env.production` saat
`npm run build`. Salin `.env.example` sebagai titik awal — file itu berisi penjelasan
lengkap tiap variabel.

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `VITE_API_BASE_URL` | ya | Alamat server superanime, mis. `http://localhost:3001`. |
| `VITE_SITE_URL` | ya di produksi | Domain publik **tanpa garis miring di akhir**. Dipakai canonical, Open Graph, dan sitemap sekaligus. Salah isi = Google mengindeks alamat yang keliru. |
| `VITE_API_SOURCE` | tidak | Sumber awal (`otakudesu` bila kosong). Pengguna tetap bisa menggantinya dari UI. |
| `VITE_SUPABASE_URL` | tidak | Kosongkan untuk menonaktifkan fitur akun. |
| `VITE_SUPABASE_ANON_KEY` | tidak | Anon/publishable key. Aman terekspos di browser **selama RLS aktif**. |

> Semua variabel `VITE_*` ikut ter-bundle dan bisa dibaca siapa saja. Jangan pernah
> menaruh `service_role` key atau password database di sini.

## Sumber data

Tiap sumber punya adapter sendiri di [src/services/sources/](src/services/sources/) yang
memetakan respons superanime ke tipe domain di [src/types/anime.ts](src/types/anime.ts).
Halaman cukup memanggil [src/services/api.ts](src/services/api.ts) dan tidak perlu tahu
sumber mana yang sedang aktif.

| Sumber | Ongoing | Completed | Cari | Genre | Jadwal | A-Z | Streaming |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Otakudesu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (7 mirror) |
| Oploverz | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (1 iframe) |
| Nimegami | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ (4 resolusi) |
| Kuramanime | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |

Kuramanime hanya bisa dijelajahi: URL videonya dihasilkan skrip ter-obfuscate dengan
token berputar di browser, jadi tidak bisa diambil dari sisi server.

Menambah sumber baru: buat adapter yang memenuhi `SourceAdapter`
([types.ts](src/services/sources/types.ts)), lalu daftarkan di
[src/services/sources/index.ts](src/services/sources/index.ts). Isi `capabilities`
dengan jujur — Navbar dan router memakainya untuk menyembunyikan menu yang tidak
didukung, dan rute yang tidak didukung dialihkan ke beranda supaya bookmark lama tidak
berujung di halaman rusak.

Sumber aktif disimpan di localStorage per perangkat. Slug anime berbeda antar sumber,
jadi cache, wishlist, riwayat, dan pemetaan episode semuanya di-scope per `sourceId`.

## Akun, wishlist, dan riwayat

Fitur akun bersifat opsional. Tanpa kredensial Supabase, aplikasi tetap berjalan penuh
untuk menjelajah dan menonton — hanya wishlist dan riwayat yang tidak tersedia.

Menyiapkannya:

1. Buat project Supabase.
2. Jalankan [supabase-user-schema.sql](supabase-user-schema.sql) di SQL Editor. Skrip ini
   membuat tabel `profiles`, `watchlist`, `watch_history`, trigger pembuat profil
   otomatis saat pendaftaran, dan policy RLS `auth.uid()` untuk ketiganya.
3. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.

Wishlist dan riwayat **hanya** disimpan untuk pengguna yang sudah masuk; tamu tidak
mencatat apa pun. Salinan di localStorage semata-mata cermin data akun supaya
"Lanjutkan tontonan" tampil seketika, dan dibuang saat pengguna keluar.

## SEO

- [index.html](index.html) memuat meta statis (title, description, Open Graph, Twitter
  Card, JSON-LD `WebSite` + `Organization`). Bagian ini yang dibaca bot media sosial,
  karena mereka tidak menjalankan JavaScript.
- [src/hooks/useSeo.ts](src/hooks/useSeo.ts) menimpa title, description, canonical, Open
  Graph, dan JSON-LD per halaman saat runtime. Googlebot merender JavaScript sehingga
  ikut membacanya.
- `robots.txt` dan `sitemap.xml` dibuat otomatis ke `dist/` oleh
  [scripts/generate-seo-files.mjs](scripts/generate-seo-files.mjs) setiap `npm run build`.
  Halaman berbasis akun dan pencarian internal sengaja di-`Disallow`. Halaman detail
  anime tidak masuk sitemap karena daftarnya berubah tiap hari — Google menemukannya
  lewat tautan internal.

Karena aplikasi ini SPA tanpa server-side rendering, pratinjau tautan di WhatsApp,
Discord, dan Twitter selalu memakai gambar serta teks default dari `index.html` — bukan
poster anime per halaman. Kalau pratinjau per judul dibutuhkan, langkah berikutnya
adalah prerender (mis. `vite-plugin-prerender`) atau pindah ke framework SSR.

## PWA

- [public/site.webmanifest](public/site.webmanifest) — nama, ikon, shortcut, dan mode
  `standalone`.
- [public/sw.js](public/sw.js) — service worker tanpa dependensi: navigasi network-first
  dengan fallback `offline.html`, aset build cache-first, gambar
  stale-while-revalidate (dibatasi 100 entri). Panggilan API sengaja tidak di-cache
  supaya data tidak basi.
- [src/utils/pwa.ts](src/utils/pwa.ts) mendaftarkan service worker **hanya di build
  produksi**; di mode dev cache-nya membuat perubahan kode seolah tidak tersimpan.
- [src/components/PwaPrompt.tsx](src/components/PwaPrompt.tsx) menampilkan tawaran pasang
  aplikasi (termasuk petunjuk manual untuk Safari iOS) dan pemberitahuan saat versi baru
  siap dipakai.

Menguji PWA: `npm run build && npm run preview`, lalu buka lewat `localhost` (service
worker hanya jalan di HTTPS atau localhost). Setelah mengubah `sw.js`, naikkan
`CACHE_VERSION` di dalamnya agar cache lama dibersihkan.

## Struktur proyek

```
public/            manifest, service worker, ikon, halaman offline
scripts/           generator robots.txt + sitemap.xml (dijalankan saat build)
src/
  components/      Navbar, Footer, kartu, skeleton, prompt PWA, error boundary
  contexts/        AuthProvider (Supabase) dan SourceProvider (sumber aktif)
  hooks/           useAsyncData (fetch + loading/error), useSeo (meta per halaman)
  lib/             klien Supabase
  pages/           satu berkas per rute
  services/
    api.ts         fasad tipis ke sumber aktif
    sources/       adapter per sumber + util bersama
    userLibrary.ts wishlist & riwayat berbasis akun
  types/           tipe domain
  utils/           cache, storage, pemetaan episode, riwayat, registrasi PWA
supabase-user-schema.sql
vercel.json        rewrite SPA + header untuk sw.js & manifest
```

## Deploy

Dikonfigurasi untuk Vercel lewat [vercel.json](vercel.json): semua rute di-rewrite ke
`index.html` (SPA), `sw.js` disajikan tanpa cache agar pembaruan langsung terdeteksi,
dan `site.webmanifest` memakai `Content-Type` yang benar.

Sebelum deploy, pastikan `VITE_SITE_URL` dan `VITE_API_BASE_URL` sudah menunjuk domain
produksi yang sebenarnya — keduanya masih berisi nilai contoh di `.env.production`.

## Catatan

Proyek ini hanya menampilkan konten dari situs pihak ketiga melalui API scraper dan tidak
menyimpan berkas video apa pun. Gunakan untuk keperluan belajar.
