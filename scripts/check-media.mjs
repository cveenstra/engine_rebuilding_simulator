#!/usr/bin/env node
// Checks src/data/parts/media.json, the attribution record for every part photo
// taken from Wikimedia Commons. No dependencies. Exits 1 on any error.
//   - every key is a catalog id from src/data/parts/catalog.json
//   - every entry has file, caption, author, license, sourceUrl, plus licenseUrl
//     (licenseUrl may be "" only for Public domain, which has no license deed)
//   - every file exists under public/ and is a JPEG of reasonable size
//   - every license is Public Domain, CC0, CC BY or CC BY-SA (any version)
//   - every sourceUrl is a Commons file page
//   node scripts/check-media.mjs
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = join(ROOT, 'src', 'data', 'parts', 'catalog.json');
const MEDIA = join(ROOT, 'src', 'data', 'parts', 'media.json');
const PUBLIC = join(ROOT, 'public');
const PHOTO_DIR = join(PUBLIC, 'parts', 'photos');

const REQUIRED = ['file', 'caption', 'author', 'license', 'sourceUrl', 'modified'];
// Public Domain, CC0, CC BY x.y, CC BY-SA x.y (with optional port suffix, e.g. "CC BY-SA 2.0 de").
const ALLOWED_LICENSE = /^(Public domain|CC0( 1\.0)?|CC BY(-SA)? \d\.\d( [a-z]{2,3})?)$/i;
const isPublicDomain = (lic) => /^Public domain$/i.test(lic.trim());
const MAX_BYTES = 200 * 1024;
const MAX_PER_PART = 2;

let errors = 0;
const err = (msg) => { errors += 1; console.error(`  error: ${msg}`); };
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

const catalogIds = new Set(JSON.parse(readFileSync(CATALOG, 'utf8')).map((p) => p.id));
if (!existsSync(MEDIA)) {
  console.error('src/data/parts/media.json is missing');
  process.exit(1);
}
const media = JSON.parse(readFileSync(MEDIA, 'utf8'));
const used = new Set();
const licenses = {};
let photos = 0;
let bytes = 0;

for (const [id, entries] of Object.entries(media)) {
  const where = `media.json "${id}"`;
  if (!catalogIds.has(id)) err(`${where}: not a catalog id`);
  if (!Array.isArray(entries) || entries.length === 0) { err(`${where}: must be a non-empty array`); continue; }
  if (entries.length > MAX_PER_PART) err(`${where}: more than ${MAX_PER_PART} photos`);
  entries.forEach((e, i) => {
    const at = `${where}[${i}]`;
    for (const f of REQUIRED) if (!isStr(e[f])) err(`${at}: missing ${f}`);
    if (isStr(e.file)) {
      if (!/^parts\/photos\/[a-z0-9-]+-\d+\.jpg$/.test(e.file)) err(`${at}: file "${e.file}" should be parts/photos/<id>-<n>.jpg`);
      if (!e.file.startsWith(`parts/photos/${id}-`)) err(`${at}: file "${e.file}" does not match id`);
      const abs = join(PUBLIC, e.file);
      if (!existsSync(abs)) err(`${at}: file not found: public/${e.file}`);
      else {
        const size = statSync(abs).size;
        bytes += size;
        if (size > MAX_BYTES) err(`${at}: ${e.file} is ${Math.round(size / 1024)} KB (max ${MAX_BYTES / 1024})`);
        const head = readFileSync(abs).subarray(0, 3);
        if (!(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)) err(`${at}: ${e.file} is not a JPEG`);
      }
      if (used.has(e.file)) err(`${at}: file used twice`);
      used.add(e.file);
    }
    if (isStr(e.license)) {
      if (!ALLOWED_LICENSE.test(e.license.trim())) err(`${at}: license "${e.license}" is not PD, CC0, CC BY or CC BY-SA`);
      licenses[e.license] = (licenses[e.license] || 0) + 1;
    }
    if (typeof e.licenseUrl !== 'string') err(`${at}: missing licenseUrl`);
    else if (e.licenseUrl === '') {
      if (isStr(e.license) && !isPublicDomain(e.license)) err(`${at}: licenseUrl may be empty only for Public domain`);
    } else if (!/^https:\/\/creativecommons\.org\//.test(e.licenseUrl)) err(`${at}: licenseUrl must be a https://creativecommons.org/ deed`);
    if (isStr(e.sourceUrl) && !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(e.sourceUrl)) {
      err(`${at}: sourceUrl must be a Commons file page`);
    }
    if (isStr(e.author) && /<[a-z][^>]*>/i.test(e.author)) err(`${at}: author contains HTML`);
    photos += 1;
  });
}

// Photos on disk that nothing credits would be published without attribution.
if (existsSync(PHOTO_DIR)) {
  for (const f of readdirSync(PHOTO_DIR)) {
    if (!f.endsWith('.jpg')) continue;
    if (!used.has(`parts/photos/${f}`)) err(`public/parts/photos/${f} has no media.json entry`);
  }
}

const covered = Object.keys(media).filter((id) => catalogIds.has(id)).length;
console.log(`media: ${photos} photos for ${covered}/${catalogIds.size} part types, ${Math.round(bytes / 1024)} KB`);
console.log(`licenses: ${Object.entries(licenses).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
if (errors) {
  console.error(`${errors} error(s)`);
  process.exit(1);
}
console.log('ok');
