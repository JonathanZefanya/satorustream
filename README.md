# SatoruStream

## SEO

- `index.html` memuat meta statis (title, description, Open Graph, Twitter Card, JSON-LD
  `WebSite` + `Organization`). Bagian ini yang dibaca bot media sosial, karena mereka
  tidak menjalankan JavaScript.
- `src/hooks/useSeo.ts` menimpa title, description, canonical, Open Graph, dan JSON-LD
  per halaman saat runtime. Googlebot merender JavaScript sehingga ikut membacanya.
- `robots.txt` dan `sitemap.xml` dibuat otomatis ke `dist/` oleh
  `scripts/generate-seo-files.mjs` setiap kali `npm run build`.
- **`VITE_SITE_URL` wajib diisi domain produksi yang benar** (tanpa garis miring di
  akhir). Nilai ini dipakai canonical, Open Graph, dan sitemap sekaligus.

Karena aplikasi ini SPA tanpa server-side rendering, pratinjau tautan di WhatsApp,
Discord, dan Twitter selalu memakai gambar serta teks default dari `index.html` — bukan
poster anime per halaman. Kalau pratinjau per judul dibutuhkan, langkah berikutnya
adalah prerender (mis. `vite-plugin-prerender`) atau pindah ke framework SSR.

## PWA

- `public/site.webmanifest` — nama, ikon, shortcut, dan mode `standalone`.
- `public/sw.js` — service worker tanpa dependensi: navigasi network-first dengan
  fallback `offline.html`, aset build cache-first, gambar stale-while-revalidate.
  Panggilan API sengaja tidak di-cache supaya data tidak basi.
- `src/utils/pwa.ts` mendaftarkan service worker **hanya di build produksi**; di mode
  dev cache-nya membuat perubahan kode seolah tidak tersimpan.
- `src/components/PwaPrompt.tsx` menampilkan tawaran pasang aplikasi (termasuk petunjuk
  manual untuk Safari iOS) dan pemberitahuan saat versi baru siap dipakai.

Menguji PWA: `npm run build && npm run preview`, lalu buka lewat `localhost` (service
worker hanya jalan di HTTPS atau localhost). Setelah mengubah `sw.js`, naikkan
`CACHE_VERSION` di dalamnya agar cache lama dibersihkan.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
