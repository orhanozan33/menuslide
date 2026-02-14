#!/usr/bin/env node
/**
 * Mevcut HLS playlist dosyasindaki relative segment satirlarini tam URL yapar.
 * Sunucuda calistirin: STREAM_PUBLIC_BASE_URL="http://68.183.205.207/stream" STREAM_OUTPUT_DIR=/var/www/menuslide/stream SLUG=menuslide-tv10 node fix-playlist-absolute-urls.js
 */
const fs = require('fs');
const path = require('path');

const base = (process.env.STREAM_PUBLIC_BASE_URL || 'http://68.183.205.207/stream').replace(/\/$/, '');
const outDir = process.env.STREAM_OUTPUT_DIR || '/var/www/menuslide/stream';
const slug = process.env.SLUG || 'menuslide-tv10';

const dir = path.join(outDir, slug);
const p = path.join(dir, 'playlist.m3u8');

if (!fs.existsSync(p)) {
  console.error('Playlist yok:', p);
  process.exit(1);
}

let m = fs.readFileSync(p, 'utf8');
const baseUrl = base + '/' + slug + '/';
const lines = m.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const L = lines[i].replace(/\s+$/, '');
  if (/^[a-zA-Z0-9_.-]+\.ts$/.test(L) && L.indexOf('http') !== 0) {
    lines[i] = baseUrl + L;
  }
}
fs.writeFileSync(p, lines.join('\n'));
console.log('Playlist guncellendi:', p);
