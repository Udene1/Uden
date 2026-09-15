import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagePath = path.join(root, 'clients/desktop/package.json');
const tauriPath = path.join(root, 'clients/desktop/src-tauri/tauri.conf.json');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));

if (pkg.version !== tauri.version) {
  throw new Error(`Desktop version mismatch: package.json=${pkg.version}, tauri.conf.json=${tauri.version}`);
}

const version = pkg.version;
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Invalid desktop SemVer: ${version}`);
}

const tag = process.env.RELEASE_TAG ?? '';
if (tag) {
  const expected = `v${version}`;
  if (tag !== expected) {
    throw new Error(`Release tag/version mismatch: tag=${tag}, expected=${expected}`);
  }
}

console.log(`Desktop release version: ${version}`);
if (tag) console.log(`Release tag: ${tag}`);
