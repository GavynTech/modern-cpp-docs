// Static site builder: renders content/**/*.md through templates/layout.html into dist/.
// BASE env var sets the URL prefix for subpath hosting (e.g. BASE=/modern-cpp-docs/).
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(ROOT, 'content');
const DIST = join(ROOT, 'dist');
const BASE = process.env.BASE ?? '/';
const SITE = 'Modern C++ Documentation';

const md = new MarkdownIt({ html: true });

// Give every heading an id so sections are linkable, like go.dev.
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const inline = tokens[idx + 1];
  if (inline && inline.type === 'inline') {
    const id = inline.content
      .replace(/<[^>]*>/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9+]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (id) tokens[idx].attrSet('id', id);
  }
  return self.renderToken(tokens, idx, options);
};

// Fenced code blocks. A block tagged `cpp run` is a complete program and gets
// a Compiler Explorer link with the source preloaded (the playground analog).
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const [lang, ...flags] = token.info.trim().split(/\s+/);
  const highlighted = lang && hljs.getLanguage(lang)
    ? hljs.highlight(token.content, { language: lang }).value
    : md.utils.escapeHtml(token.content);
  const run = flags.includes('run') ? godboltLink(token.content) : '';
  return `<div class="code">${run}<pre><code class="hljs">${highlighted}</code></pre></div>\n`;
};

function godboltLink(source) {
  const state = {
    sessions: [{
      id: 1,
      language: 'c++',
      source,
      compilers: [{ id: 'g151', options: '-std=c++23 -Wall -Wextra' }],
      executors: [{ compiler: { id: 'g151', options: '-std=c++23' } }],
    }],
  };
  const b64 = Buffer.from(JSON.stringify(state)).toString('base64');
  return `<a class="run" href="https://godbolt.org/clientstate/${encodeURIComponent(b64)}" target="_blank" rel="noopener">Run in Compiler Explorer</a>`;
}

const layout = readFileSync(join(ROOT, 'templates', 'layout.html'), 'utf8');

function renderPage(fm, body) {
  const pageTitle = fm.home ? SITE : `${fm.title} - ${SITE}`;
  const breadcrumb = fm.section
    ? `<nav class="breadcrumb"><a href="/">Documentation</a> <span>/</span> <a href="${fm.section_href ?? '/'}">${fm.section}</a></nav>`
    : '';
  const next = fm.next
    ? `<p class="next">Next: <a href="${fm.next.href}">${fm.next.title}</a> &rarr;</p>`
    : '';
  return layout
    .replaceAll('{{pagetitle}}', pageTitle)
    .replaceAll('{{description}}', fm.description ?? '')
    .replaceAll('{{breadcrumb}}', breadcrumb)
    .replaceAll('{{title}}', fm.title ?? '')
    .replaceAll('{{content}}', body)
    .replaceAll('{{next}}', next);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return p.endsWith('.md') ? [p] : [];
  });
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const file of walk(CONTENT).sort()) {
  const { data, content } = matter(readFileSync(file, 'utf8'));
  let html = renderPage(data, md.render(content));
  // Rewrite root-relative URLs for subpath hosting.
  html = html.replaceAll('href="/', `href="${BASE}`).replaceAll('src="/', `src="${BASE}`);
  const rel = relative(CONTENT, file).split('\\').join('/');
  const out = rel === 'index.md'
    ? join(DIST, 'index.html')
    : join(DIST, rel.replace(/\.md$/, ''), 'index.html');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log('built', relative(DIST, out));
}

cpSync(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });
console.log(`done (base: ${BASE})`);
