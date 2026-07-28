/**
 * Membuat robots.txt dan sitemap.xml ke folder dist setelah `vite build`.
 *
 * Dibuat saat build, bukan ditaruh statis di public/, supaya domainnya selalu
 * ikut VITE_SITE_URL. Kalau ditulis manual di dua tempat, canonical dan sitemap
 * gampang menunjuk domain berbeda — dan itu langsung merusak pengindeksan.
 *
 * Halaman detail anime dan episode tidak dimasukkan: daftarnya datang dari API
 * pihak ketiga dan berubah tiap hari. Google menemukannya lewat tautan internal
 * dari beranda, katalog A-Z, dan halaman genre.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = resolve(projectRoot, 'dist')

/** Urutan baca menyerupai Vite: file paling spesifik menang. */
const ENV_FILES = ['.env.production.local', '.env.production', '.env.local', '.env']

const readEnvValue = (key) => {
  if (process.env[key]) {
    return process.env[key]
  }

  for (const fileName of ENV_FILES) {
    const filePath = resolve(projectRoot, fileName)

    if (!existsSync(filePath)) {
      continue
    }

    const match = readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => !line.trimStart().startsWith('#'))
      .map((line) => line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`)))
      .find(Boolean)

    if (match) {
      const value = match[1].trim().replace(/^["']|["']$/g, '')

      if (value) {
        return value
      }
    }
  }

  return ''
}

const siteUrl = readEnvValue('VITE_SITE_URL').replace(/\/+$/, '')

if (!siteUrl) {
  console.warn(
    '[seo] VITE_SITE_URL kosong. robots.txt dan sitemap.xml dilewati karena URL absolut wajib ada di sitemap.',
  )
  process.exit(0)
}

/** Rute publik yang layak diindeks. Halaman berbasis akun sengaja tidak ada. */
const ROUTES = [
  { path: '/', changefreq: 'hourly', priority: '1.0' },
  { path: '/ongoing', changefreq: 'hourly', priority: '0.9' },
  { path: '/jadwal-rilis', changefreq: 'daily', priority: '0.8' },
  { path: '/anime-list', changefreq: 'daily', priority: '0.8' },
  { path: '/genres', changefreq: 'weekly', priority: '0.7' },
]

const lastmod = new Date().toISOString().split('T')[0]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(
  ({ path, changefreq, priority }) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
).join('\n')}
</urlset>
`

const robots = `# robots.txt SatoruStream — dihasilkan otomatis saat build.
User-agent: *
Allow: /

# Halaman berbasis akun dan hasil pencarian internal: tidak berguna di hasil
# pencarian dan hanya menghabiskan anggaran crawl.
Disallow: /login
Disallow: /wishlist
Disallow: /history
Disallow: /search

Sitemap: ${siteUrl}/sitemap.xml
`

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true })
}

writeFileSync(resolve(distDir, 'sitemap.xml'), sitemap, 'utf8')
writeFileSync(resolve(distDir, 'robots.txt'), robots, 'utf8')

console.log(`[seo] robots.txt dan sitemap.xml dibuat untuk ${siteUrl}`)
