<h1 align="center">SatoruStream</h1>

<p align="center">
  <strong>Streaming anime subtitle Indonesia — satu antarmuka, banyak sumber.</strong>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=000">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=fff">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=fff">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss&logoColor=fff">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-auth-3ecf8e?logo=supabase&logoColor=fff">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-ready-e11d48">
</p>

<p align="center">
  <a href="#fitur">Fitur</a> •
  <a href="#menjalankan">Menjalankan</a> •
  <a href="#konfigurasi-environment">Environment</a> •
  <a href="#sumber-data">Sumber</a> •
  <a href="#tampilan-dan-tema">Tema</a> •
  <a href="#deploy">Deploy</a>
</p>

---

Frontend React + TypeScript + Vite dengan Tailwind CSS, React Router, dan Supabase untuk
fitur akun. Semua data diambil dari
[**superanime-rest-api**](https://github.com/JonathanZefanya/superanime-rest-api), API
scraper terpisah yang harus jalan lebih dulu. SatoruStream sendiri tidak melakukan
scraping.

Sumber scraper bisa ditukar kapan saja lewat pemilih **Sumber** di header beranda. Menu
yang tidak didukung sumber aktif otomatis disembunyikan.

## Fitur

- **Jelajah** — beranda (ongoing + completed), daftar ongoing berhalaman, jadwal rilis per
  hari, katalog A-Z, daftar genre, dan pencarian dengan saran instan (pintasan `/`).
- **Tonton** — pemutar iframe dengan pilihan server/mirror dan resolusi, navigasi episode
  sebelumnya/berikutnya, serta tautan unduhan sebagai cadangan.
- **Rekomendasi** — disusun dari genre anime yang terakhir ditonton.
- **Akun** — daftar/masuk lewat Supabase Auth (email + password).
- **Wishlist, riwayat, dan "Lanjutkan tontonan"** — terikat akun, tersimpan di Supabase
  dengan RLS.
- **Tema terang/gelap** — mengikuti sistem secara default, pilihan disimpan per perangkat.
- **PWA** — bisa dipasang, punya halaman offline, dan cache aset build.
- **SEO** — meta statis, meta per halaman saat runtime, serta `robots.txt` dan
  `sitemap.xml` yang dibuat otomatis saat build.

## Menjalankan

Prasyarat: Node.js 20+ dan [Bun](https://bun.sh) untuk menjalankan API.

```bash
# 1. API lebih dulu (repo terpisah)
git clone https://github.com/JonathanZefanya/superanime-rest-api.git
cd superanime-rest-api && bun install && bun dev   # http://localhost:3001

# 2. SatoruStream
git clone https://github.com/JonathanZefanya/satorustream.git
cd satorustream
npm install
cp .env.example .env.development                   # lalu isi variabelnya
npm run dev                                        # http://localhost:5173
```

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Dev server Vite dengan HMR. |
| `npm run build` | `tsc -b` → `vite build` → buat `robots.txt` + `sitemap.xml`. |
| `npm run preview` | Menyajikan `dist/`. Wajib dipakai untuk menguji PWA. |
| `npm run lint` | ESLint untuk seluruh proyek. |

## Konfigurasi environment

Vite memuat `.env.development` saat `npm run dev` dan `.env.production` saat
`npm run build`. Salin [.env.example](.env.example) sebagai titik awal; file itu berisi
penjelasan tiap variabel.

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `VITE_API_BASE_URL` | ya | Alamat superanime-rest-api, mis. `http://localhost:3001`. |
| `VITE_SITE_URL` | ya di produksi | Domain publik **tanpa garis miring di akhir**. Dipakai canonical, Open Graph, dan sitemap. |
| `VITE_API_SOURCE` | tidak | Sumber awal (`otakudesu` bila kosong atau tidak valid). Pengguna tetap bisa menggantinya dari UI. |
| `VITE_SUPABASE_URL` | tidak | Kosongkan untuk menonaktifkan fitur akun. |
| `VITE_SUPABASE_ANON_KEY` | tidak | Anon/publishable key. Aman terekspos di browser **selama RLS aktif**. |

> Semua variabel `VITE_*` ikut ter-bundle dan bisa dibaca siapa saja. Jangan pernah
> menaruh `service_role` key atau password database di sini.

## Sumber data

Tiap sumber punya adapter di [src/services/sources/](src/services/sources/) yang memetakan
respons API ke tipe domain di [src/types/anime.ts](src/types/anime.ts). Halaman cukup
memanggil [src/services/api.ts](src/services/api.ts) tanpa perlu tahu sumber mana yang
aktif.

| Sumber | Ongoing | Completed | Cari | Genre | Jadwal | A-Z | Tonton | Ketersediaan |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- |
| Otakudesu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | produksi |
| Oploverz | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | produksi |
| YLnime | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | produksi |
| NontonAnimeID | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | dev saja |
| Doronime | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ⬇️ unduhan saja | dev saja |
| Kuramanime | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | dev saja |
| Nimegami | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | nonaktif |

- **Dev saja** — situsnya dilindungi Cloudflare yang menolak IP datacenter, jadi API yang
  berjalan di Vercel selalu dibalas 403. Sumber ini tersedia saat `npm run dev` dan
  disembunyikan di build produksi (`DEV_ONLY_SOURCE_IDS`).
- **Nonaktif** — disembunyikan di semua build (`DISABLED_SOURCE_IDS`).
- Kuramanime hanya bisa dijelajahi: URL videonya dihasilkan skrip ter-obfuscate di browser.

Menambah sumber baru: buat adapter yang memenuhi `SourceAdapter`
([types.ts](src/services/sources/types.ts)), lalu daftarkan di
[src/services/sources/index.ts](src/services/sources/index.ts). Isi `capabilities` dengan
jujur: Navbar memakainya untuk menyembunyikan menu, dan router mengalihkan rute yang tidak
didukung ke beranda.

Sumber aktif disimpan di localStorage per perangkat. Slug anime berbeda antar sumber, jadi
cache, wishlist, riwayat, dan pemetaan episode semuanya di-scope per `sourceId`.

## Akun, wishlist, dan riwayat

Fitur akun bersifat opsional. Tanpa kredensial Supabase, aplikasi tetap berjalan penuh
untuk menjelajah dan menonton; hanya wishlist dan riwayat yang tidak tersedia.

1. Buat project Supabase.
2. Jalankan [supabase-user-schema.sql](supabase-user-schema.sql) di SQL Editor. Skrip ini
   membuat tabel `profiles`, `watchlist`, `watch_history`, trigger pembuat profil saat
   pendaftaran, dan policy RLS `auth.uid()` untuk ketiganya.
3. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.

Wishlist dan riwayat **hanya** disimpan untuk pengguna yang sudah masuk. Salinan di
localStorage hanya cermin data akun supaya "Lanjutkan tontonan" tampil seketika, dan
dibuang saat pengguna keluar.

## Tampilan dan tema

- Warna netral didefinisikan sebagai token CSS di [src/index.css](src/index.css)
  (`--c-app-bg`, `--c-surface`, `--c-line`, `--c-ink`, dst.) dengan nilai terpisah untuk
  light dan dark mode.
- [tailwind.config.js](tailwind.config.js) memetakan `bg-white`, `bg-slate-50/100/200`,
  `border-slate-100/200`, dan `text-slate-800/900` ke token tersebut. Komponen cukup
  memakai kelas Tailwind biasa dan otomatis mengikuti tema. Light mode sengaja tidak
  memakai putih murni agar tidak menyilaukan.
- Kelas `.surface-panel` dipakai untuk membungkus tiap section dalam panel ber-padding.
- Skrip kecil di [index.html](index.html) memasang kelas `dark` sebelum halaman dirender,
  sehingga tidak ada kedipan putih saat memuat dalam dark mode.

## SEO

- [index.html](index.html) memuat meta statis (title, description, Open Graph, Twitter
  Card, JSON-LD). Bagian ini yang dibaca bot media sosial.
- [src/hooks/useSeo.ts](src/hooks/useSeo.ts) menimpa title, description, canonical, Open
  Graph, dan JSON-LD per halaman saat runtime.
- [scripts/generate-seo-files.mjs](scripts/generate-seo-files.mjs) membuat `robots.txt` dan
  `sitemap.xml` ke `dist/` setiap build. Halaman akun dan pencarian di-`Disallow`;
  halaman detail anime ditemukan Google lewat tautan internal.

Karena aplikasi ini SPA tanpa SSR, pratinjau tautan di WhatsApp, Discord, dan X selalu
memakai gambar dan teks default dari `index.html`.

## PWA

- [public/site.webmanifest](public/site.webmanifest) — nama, ikon, shortcut, mode
  `standalone`.
- [public/sw.js](public/sw.js) — navigasi network-first dengan fallback `offline.html`,
  aset build cache-first, gambar stale-while-revalidate (maks. 100 entri). Panggilan API
  tidak di-cache.
- [src/utils/pwa.ts](src/utils/pwa.ts) mendaftarkan service worker **hanya di build
  produksi**.
- [src/components/PwaPrompt.tsx](src/components/PwaPrompt.tsx) menampilkan tawaran pasang
  aplikasi (termasuk petunjuk Safari iOS) dan pemberitahuan versi baru.

Menguji PWA: `npm run build && npm run preview`, lalu buka lewat `localhost`. Setelah
mengubah `sw.js`, naikkan `CACHE_VERSION` di dalamnya agar cache lama dibersihkan.

## Struktur proyek

```
public/            manifest, service worker, ikon, halaman offline
scripts/           generator robots.txt + sitemap.xml
src/
  components/      Navbar, Footer, kartu, skeleton, dialog, prompt PWA, error boundary
  contexts/        AuthProvider (Supabase) dan SourceProvider (sumber aktif)
  hooks/           useAsyncData, useSeo, useScrollRestoration
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
`index.html`, `sw.js` disajikan tanpa cache, dan `site.webmanifest` memakai
`Content-Type` yang benar.

Sebelum deploy, pastikan `VITE_SITE_URL` dan `VITE_API_BASE_URL` di `.env.production`
(atau environment Vercel) sudah menunjuk domain produksi.

## Disclaimer

Proyek ini hanya menampilkan konten dari situs pihak ketiga melalui API scraper dan tidak
menyimpan berkas video apa pun. Gunakan untuk keperluan belajar.
