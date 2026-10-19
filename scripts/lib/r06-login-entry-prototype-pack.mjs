/** login-entry-20261018 prototype tarball: SHA256 gate + static HTTP (ES modules need correct MIME). */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const LOGIN_ENTRY_PROTO_PACKAGE_COMMIT = '9bc52fb9152293e992e98dc50804a660cef10733';
export const LOGIN_ENTRY_PROTO_TAR_SHA256 =
  '382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d';

const GIT_TAR_PATH = `docs/reference/login-entry-20261018/prototype.tar.gz`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function tarballBytes(repoRoot) {
  const onDisk = path.join(repoRoot, GIT_TAR_PATH);
  if (existsSync(onDisk)) {
    return readFileSync(onDisk);
  }
  const res = spawnSync(
    'git',
    ['show', `${LOGIN_ENTRY_PROTO_PACKAGE_COMMIT}:${GIT_TAR_PATH}`],
    { cwd: repoRoot, encoding: 'buffer', maxBuffer: 80 * 1024 * 1024 },
  );
  if (res.status !== 0 || !res.stdout?.length) {
    throw new Error('prototype_tarball_unavailable');
  }
  return res.stdout;
}

export function verifyLoginEntryPrototypeTarball(repoRoot) {
  const bytes = tarballBytes(repoRoot);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== LOGIN_ENTRY_PROTO_TAR_SHA256) {
    throw new Error(`prototype_tar_sha256_mismatch:expected=${LOGIN_ENTRY_PROTO_TAR_SHA256} got=${sha}`);
  }
  return bytes;
}

export function ensureLoginEntryPrototypeExtracted(repoRoot, protoDir) {
  verifyLoginEntryPrototypeTarball(repoRoot);
  const marker = path.join(protoDir, 'roles.js');
  if (existsSync(marker)) return;
  mkdirSync(protoDir, { recursive: true });
  const bytes = tarballBytes(repoRoot);
  const tmp = path.join(protoDir, '.prototype-login-entry.tar.gz');
  writeFileSync(tmp, bytes);
  const untar = spawnSync('tar', ['-xzf', tmp, '-C', protoDir], { stdio: 'inherit' });
  unlinkSync(tmp);
  if (untar.status !== 0) throw new Error('prototype_tar_extract_failed');
  if (!existsSync(marker)) throw new Error('prototype_extract_incomplete:roles.js');
}

export function startLoginEntryPrototypeStatic(protoDir) {
  return new Promise((resolve, reject) => {
    const root = path.resolve(protoDir);
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
      let rel = urlPath === '/' ? '/roles.html' : urlPath;
      const filePath = path.normalize(path.join(root, rel));
      if (!filePath.startsWith(root) || !existsSync(filePath)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
    server.on('error', reject);
  });
}

export const PROTO_LOAD_ERROR = 'Не удалось загрузить прототип';

export async function assertPrototypePageReady(page) {
  await page.waitForFunction(
    (errText) => {
      const body = document.body?.textContent ?? '';
      if (body.includes(errText)) return false;
      if (body.includes('Загружаем прототип')) return false;
      return Boolean(document.querySelector('#app [data-action], #app .pw, #app .production-profile'));
    },
    PROTO_LOAD_ERROR,
    { timeout: 90_000 },
  );
}
