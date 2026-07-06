// Quality gate: every ```cpp run``` block in content/ must be a complete
// program that compiles cleanly with g++ -std=c++23 -Wall -Wextra.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(ROOT, 'content');
const TMP = join(ROOT, '.samples-check');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return p.endsWith('.md') ? [p] : [];
  });
}

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

let total = 0;
let failed = 0;

for (const file of walk(CONTENT).sort()) {
  const text = readFileSync(file, 'utf8');
  const page = relative(CONTENT, file);
  let m;
  let n = 0;
  const re = /```cpp run\n([\s\S]*?)```/g;
  while ((m = re.exec(text)) !== null) {
    n += 1;
    total += 1;
    const src = join(TMP, `${page.replace(/[\\/]/g, '_').replace(/\.md$/, '')}_${n}.cpp`);
    writeFileSync(src, m[1]);
    const res = spawnSync('g++', ['-std=c++23', '-Wall', '-Wextra', src, '-o', '/dev/null'], {
      encoding: 'utf8',
    });
    if (res.status !== 0) {
      failed += 1;
      console.error(`FAIL ${page} sample ${n}\n${res.stderr}`);
    } else if (res.stderr.trim()) {
      console.warn(`WARN ${page} sample ${n}\n${res.stderr}`);
    } else {
      console.log(`ok   ${page} sample ${n}`);
    }
  }
}

console.log(`\n${total - failed}/${total} samples compile cleanly`);
process.exit(failed ? 1 : 0);
