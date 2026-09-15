import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);

const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const tauriConfig = JSON.parse(await readFile(new URL('src-tauri/tauri.conf.json', root), 'utf8'));

const packageVersion = packageJson.version;
const tauriVersion = tauriConfig.version;

if (!packageVersion || !tauriVersion) {
  throw new Error(`Desktop version is missing (package=${packageVersion ?? 'missing'}, tauri=${tauriVersion ?? 'missing'}).`);
}

if (packageVersion !== tauriVersion) {
  throw new Error(`Desktop version mismatch: package.json=${packageVersion}, tauri.conf.json=${tauriVersion}.`);
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(packageVersion)) {
  throw new Error(`Desktop version is not valid SemVer: ${packageVersion}`);
}

console.log(`Desktop release version: ${packageVersion}`);
