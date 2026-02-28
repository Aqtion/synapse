import { getSandbox, proxyToSandbox } from '@cloudflare/sandbox';

export { Sandbox } from '@cloudflare/sandbox';

// ──────────────────────────────────────────────
// Starter multi-page app
// ──────────────────────────────────────────────

const STARTER_FILES: Record<string, string> = {
  'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Starter App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">Acme</a>
      <button class="nav-toggle" aria-label="Menu">&#9776;</button>
      <ul class="nav-links">
        <li><a href="index.html" class="active">Home</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="projects.html">Projects</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </div>
  </nav>

  <section class="hero">
    <h1>Build something amazing</h1>
    <p>A modern starter template you can transform with a single prompt.</p>
    <div class="hero-actions">
      <a href="projects.html" class="btn btn-primary">View Projects</a>
      <a href="contact.html" class="btn btn-outline">Get in Touch</a>
    </div>
  </section>

  <section class="features">
    <div class="container grid-3">
      <div class="card">
        <div class="card-icon">&#9889;</div>
        <h3>Fast</h3>
        <p>Optimised for speed with lightweight, semantic HTML and modern CSS.</p>
      </div>
      <div class="card">
        <div class="card-icon">&#127912;</div>
        <h3>Beautiful</h3>
        <p>Clean design with thoughtful spacing, typography and colour.</p>
      </div>
      <div class="card">
        <div class="card-icon">&#128736;</div>
        <h3>Flexible</h3>
        <p>Easy to customise — just describe what you want and watch it change.</p>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container">&copy; 2026 Acme. All rights reserved.</div>
  </footer>

  <script src="app.js"></script>
</body>
</html>`,

  'about.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About &mdash; Starter App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">Acme</a>
      <button class="nav-toggle" aria-label="Menu">&#9776;</button>
      <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="about.html" class="active">About</a></li>
        <li><a href="projects.html">Projects</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </div>
  </nav>

  <section class="page-header">
    <h1>About Us</h1>
    <p>We are a small team passionate about building great things.</p>
  </section>

  <section class="container" style="padding-block:3rem">
    <div class="grid-2">
      <div>
        <h2>Our Mission</h2>
        <p>We believe great software starts with empathy. Our mission is to make powerful tools that feel effortless to use.</p>
        <p>Founded in 2024, we have shipped products used by thousands of developers around the world.</p>
      </div>
      <div>
        <h2>The Team</h2>
        <div class="team-grid">
          <div class="team-card">
            <div class="avatar">JD</div>
            <strong>Jane Doe</strong>
            <span>CEO &amp; Co-founder</span>
          </div>
          <div class="team-card">
            <div class="avatar">AS</div>
            <strong>Alex Smith</strong>
            <span>Lead Engineer</span>
          </div>
          <div class="team-card">
            <div class="avatar">MR</div>
            <strong>Maria Ruiz</strong>
            <span>Designer</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container">&copy; 2026 Acme. All rights reserved.</div>
  </footer>

  <script src="app.js"></script>
</body>
</html>`,

  'projects.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Projects &mdash; Starter App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">Acme</a>
      <button class="nav-toggle" aria-label="Menu">&#9776;</button>
      <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="projects.html" class="active">Projects</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </div>
  </nav>

  <section class="page-header">
    <h1>Projects</h1>
    <p>A showcase of things we have built.</p>
  </section>

  <section class="container" style="padding-block:3rem">
    <div class="grid-3">
      <div class="project-card">
        <div class="project-img" style="background:#6c72cb"></div>
        <div class="project-body">
          <h3>Dashboard UI</h3>
          <p>An analytics dashboard with real-time charts and data tables.</p>
          <span class="tag">React</span><span class="tag">D3</span>
        </div>
      </div>
      <div class="project-card">
        <div class="project-img" style="background:#34d399"></div>
        <div class="project-body">
          <h3>Chat Platform</h3>
          <p>End-to-end encrypted messaging with file sharing and threads.</p>
          <span class="tag">WebSocket</span><span class="tag">Node</span>
        </div>
      </div>
      <div class="project-card">
        <div class="project-img" style="background:#f59e0b"></div>
        <div class="project-body">
          <h3>Design System</h3>
          <p>A comprehensive component library with theming support.</p>
          <span class="tag">CSS</span><span class="tag">Figma</span>
        </div>
      </div>
      <div class="project-card">
        <div class="project-img" style="background:#ec4899"></div>
        <div class="project-body">
          <h3>Mobile App</h3>
          <p>Cross-platform fitness tracker with workout plans and progress charts.</p>
          <span class="tag">React Native</span>
        </div>
      </div>
      <div class="project-card">
        <div class="project-img" style="background:#3b82f6"></div>
        <div class="project-body">
          <h3>API Gateway</h3>
          <p>High-performance proxy with rate limiting, auth and caching.</p>
          <span class="tag">Rust</span><span class="tag">Cloudflare</span>
        </div>
      </div>
      <div class="project-card">
        <div class="project-img" style="background:#8b5cf6"></div>
        <div class="project-body">
          <h3>AI Copilot</h3>
          <p>Code assistant plugin for VS Code powered by LLMs.</p>
          <span class="tag">TypeScript</span><span class="tag">LLM</span>
        </div>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container">&copy; 2026 Acme. All rights reserved.</div>
  </footer>

  <script src="app.js"></script>
</body>
</html>`,

  'contact.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact &mdash; Starter App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">Acme</a>
      <button class="nav-toggle" aria-label="Menu">&#9776;</button>
      <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="projects.html">Projects</a></li>
        <li><a href="contact.html" class="active">Contact</a></li>
      </ul>
    </div>
  </nav>

  <section class="page-header">
    <h1>Contact</h1>
    <p>We would love to hear from you.</p>
  </section>

  <section class="container" style="padding-block:3rem">
    <div class="grid-2">
      <div>
        <form class="contact-form" onsubmit="event.preventDefault(); alert('Message sent! (demo)')">
          <label for="name">Name</label>
          <input type="text" id="name" placeholder="Your name" required>
          <label for="email">Email</label>
          <input type="email" id="email" placeholder="you@example.com" required>
          <label for="message">Message</label>
          <textarea id="message" rows="5" placeholder="How can we help?" required></textarea>
          <button type="submit" class="btn btn-primary" style="width:100%">Send Message</button>
        </form>
      </div>
      <div class="contact-info">
        <h2>Get in Touch</h2>
        <p>Have a question or want to work together? Fill out the form or reach us directly.</p>
        <div class="info-item"><strong>Email</strong><br>hello@acme.dev</div>
        <div class="info-item"><strong>Location</strong><br>San Francisco, CA</div>
        <div class="info-item"><strong>Hours</strong><br>Mon &ndash; Fri, 9am &ndash; 5pm PT</div>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container">&copy; 2026 Acme. All rights reserved.</div>
  </footer>

  <script src="app.js"></script>
</body>
</html>`,

  'styles.css': `/* ── Reset & Base ── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
  --color-bg:#f8f9fb;--color-surface:#ffffff;--color-text:#1a1a2e;
  --color-text-dim:#64748b;--color-primary:#6c72cb;--color-primary-hover:#5a60b6;
  --color-accent:#34d399;--color-border:#e2e8f0;
  --font-sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --radius:10px;--shadow:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
  --shadow-lg:0 10px 25px rgba(0,0,0,.08);
  --max-w:1100px;
}
html{scroll-behavior:smooth}
body{font-family:var(--font-sans);color:var(--color-text);background:var(--color-bg);line-height:1.6}
img{max-width:100%;display:block}
a{color:var(--color-primary);text-decoration:none}

/* ── Layout ── */
.container{max-width:var(--max-w);margin-inline:auto;padding-inline:1.25rem}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem}
@media(max-width:768px){
  .grid-2,.grid-3{grid-template-columns:1fr}
}

/* ── Nav ── */
.nav{background:var(--color-surface);border-bottom:1px solid var(--color-border);position:sticky;top:0;z-index:100}
.nav-inner{max-width:var(--max-w);margin-inline:auto;padding:.85rem 1.25rem;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-weight:800;font-size:1.25rem;color:var(--color-text);letter-spacing:-.5px}
.nav-links{display:flex;list-style:none;gap:1.5rem}
.nav-links a{color:var(--color-text-dim);font-size:.925rem;font-weight:500;transition:color .15s}
.nav-links a:hover,.nav-links a.active{color:var(--color-primary)}
.nav-toggle{display:none;background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--color-text)}
@media(max-width:768px){
  .nav-toggle{display:block}
  .nav-links{display:none;flex-direction:column;position:absolute;top:100%;left:0;right:0;background:var(--color-surface);border-bottom:1px solid var(--color-border);padding:1rem 1.25rem;gap:.75rem}
  .nav-links.open{display:flex}
}

/* ── Hero ── */
.hero{text-align:center;padding:5rem 1.25rem 4rem;background:linear-gradient(135deg,#eef2ff 0%,#f0fdf4 100%)}
.hero h1{font-size:clamp(2rem,5vw,3.25rem);font-weight:800;letter-spacing:-.5px;line-height:1.15;margin-bottom:.75rem}
.hero p{font-size:1.15rem;color:var(--color-text-dim);max-width:520px;margin-inline:auto;margin-bottom:1.75rem}
.hero-actions{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;padding:.7rem 1.5rem;border-radius:var(--radius);font-weight:600;font-size:.925rem;transition:all .15s;cursor:pointer;border:2px solid transparent}
.btn-primary{background:var(--color-primary);color:#fff;border-color:var(--color-primary)}
.btn-primary:hover{background:var(--color-primary-hover);border-color:var(--color-primary-hover)}
.btn-outline{border-color:var(--color-border);color:var(--color-text)}
.btn-outline:hover{border-color:var(--color-primary);color:var(--color-primary)}

/* ── Cards ── */
.card{background:var(--color-surface);padding:2rem;border-radius:var(--radius);border:1px solid var(--color-border);transition:box-shadow .2s}
.card:hover{box-shadow:var(--shadow-lg)}
.card-icon{font-size:1.75rem;margin-bottom:.75rem}
.card h3{margin-bottom:.5rem;font-size:1.1rem}
.card p{color:var(--color-text-dim);font-size:.925rem}

/* ── Page Header ── */
.page-header{text-align:center;padding:4rem 1.25rem 2.5rem;background:linear-gradient(135deg,#eef2ff 0%,#f0fdf4 100%)}
.page-header h1{font-size:2.25rem;font-weight:800;letter-spacing:-.4px;margin-bottom:.5rem}
.page-header p{color:var(--color-text-dim);font-size:1.05rem}

/* ── Features ── */
.features{padding:4rem 0}

/* ── Project Cards ── */
.project-card{background:var(--color-surface);border-radius:var(--radius);overflow:hidden;border:1px solid var(--color-border);transition:transform .2s,box-shadow .2s}
.project-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg)}
.project-img{height:140px}
.project-body{padding:1.25rem}
.project-body h3{margin-bottom:.4rem;font-size:1.05rem}
.project-body p{color:var(--color-text-dim);font-size:.875rem;margin-bottom:.75rem}
.tag{display:inline-block;padding:.2rem .6rem;border-radius:20px;font-size:.75rem;font-weight:600;background:#eef2ff;color:var(--color-primary);margin-right:.35rem}

/* ── Contact ── */
.contact-form label{display:block;font-weight:600;font-size:.875rem;margin-bottom:.35rem;margin-top:1rem}
.contact-form label:first-child{margin-top:0}
.contact-form input,.contact-form textarea{width:100%;padding:.7rem .85rem;border:1px solid var(--color-border);border-radius:var(--radius);font-family:var(--font-sans);font-size:.925rem;transition:border-color .15s}
.contact-form input:focus,.contact-form textarea:focus{outline:none;border-color:var(--color-primary)}
.contact-form button{margin-top:1.25rem}
.contact-info{padding-top:1rem}
.contact-info h2{margin-bottom:.75rem}
.contact-info p{color:var(--color-text-dim);margin-bottom:1.5rem}
.info-item{margin-bottom:1rem;line-height:1.5}

/* ── Team ── */
.team-grid{display:flex;flex-direction:column;gap:1rem;margin-top:1rem}
.team-card{display:flex;align-items:center;gap:1rem;padding:.85rem;background:var(--color-bg);border-radius:var(--radius)}
.team-card strong{display:block;font-size:.925rem}
.team-card span{font-size:.825rem;color:var(--color-text-dim)}
.avatar{width:44px;height:44px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0}

/* ── Footer ── */
.footer{padding:2rem 0;text-align:center;font-size:.85rem;color:var(--color-text-dim);border-top:1px solid var(--color-border);margin-top:2rem}
`,

  'app.js': `// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }
});
`,
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function mimeFor(path: string): string {
  const ext = path.slice(path.lastIndexOf('.'));
  return MIME[ext] || 'application/octet-stream';
}

function parseMultiFile(raw: string): Record<string, string> {
  const files: Record<string, string> = {};
  const blocks = raw.split(/^={3,}FILE:\s*/m);
  for (const block of blocks) {
    if (!block.trim()) continue;
    const nlIdx = block.indexOf('\n');
    if (nlIdx === -1) continue;
    const name = block.slice(0, nlIdx).replace(/={3,}\s*$/, '').trim();
    if (!name) continue;
    let content = block.slice(nlIdx + 1);
    content = content.replace(/\n={3,}ENDFILE={0,3}\s*$/i, '');
    files[name] = content;
  }
  return files;
}

function extractSingleHtml(text: string): string | null {
  const doctypeMatch = text.match(/(<!DOCTYPE[\s\S]*<\/html>)/i);
  if (doctypeMatch) return doctypeMatch[1].trim();
  const htmlTagMatch = text.match(/(<html[\s\S]*<\/html>)/i);
  if (htmlTagMatch) return htmlTagMatch[1].trim();
  return null;
}

const SYSTEM_PROMPT = `You are an expert frontend web developer. You work on a multi-page static web app served from a flat directory.

CURRENT FILE STRUCTURE will be provided. You must return ONLY the files that need to change or be created. Use this exact format — no markdown, no explanations, no commentary outside the file blocks:

===FILE: filename.ext===
file content here
===FILE: another.ext===
file content here

Rules:
- Output ONLY files that changed or are new. Unchanged files should be omitted.
- Each page is a standalone .html file that links to shared styles.css and app.js.
- All pages must share the same <nav> so users can navigate between them.
- Keep CSS in styles.css and JS in app.js (not inline), except where page-specific logic is needed.
- Use modern, clean CSS (custom properties, flexbox/grid, transitions).
- Make everything responsive.
- If the user asks to add a new page, create the .html file AND update the nav in every existing .html file.
- If the user asks to remove a page, delete it by outputting an empty file body AND update navs.
- Start each .html file with <!DOCTYPE html>.
- Never wrap output in markdown code fences.`;

const APP_DIR = '/workspace/app';
const SANDBOX_ID_RE = /^\/s\/([a-z0-9][a-z0-9-]{0,28}[a-z0-9]?)\//;

// ──────────────────────────────────────────────
// Worker
// ──────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const proxyResponse = await proxyToSandbox(request, env);
    if (proxyResponse) return proxyResponse;

    const url = new URL(request.url);
    const { hostname } = url;

    // ── Dashboard ──
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(DASHBOARD_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── Redirect /s/:id to /s/:id/ ──
    const bareMatch = url.pathname.match(/^\/s\/([a-z0-9][a-z0-9-]{0,28}[a-z0-9]?)$/);
    if (bareMatch) {
      return Response.redirect(`${url.origin}/s/${bareMatch[1]}/`, 301);
    }

    // ── Sandbox routes: /s/:id/... ──
    const idMatch = url.pathname.match(SANDBOX_ID_RE);
    if (!idMatch) {
      return new Response('Not found', { status: 404 });
    }

    const sandboxId = idMatch[1];
    const sub = url.pathname.slice(`/s/${sandboxId}/`.length);

    // ── Studio UI ──
    if (sub === '' || sub === 'index.html') {
      return new Response(studioHtml(sandboxId), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── Preview: serve files from this sandbox ──
    if (sub.startsWith('preview')) {
      try {
        const sandbox = getSandbox(env.Sandbox, sandboxId);
        let filePath = sub.replace(/^preview\/?/, '') || 'index.html';
        if (filePath.endsWith('/')) filePath += 'index.html';
        const file = await sandbox.readFile(`${APP_DIR}/${filePath}`);
        return new Response(file.content, {
          headers: { 'Content-Type': mimeFor(filePath) },
        });
      } catch {
        return new Response('File not found', { status: 404 });
      }
    }

    // ── API: init ──
    if (sub === 'api/init' && request.method === 'POST') {
      try {
        const sandbox = getSandbox(env.Sandbox, sandboxId);
        await sandbox.mkdir(APP_DIR, { recursive: true });

        for (const [name, content] of Object.entries(STARTER_FILES)) {
          await sandbox.writeFile(`${APP_DIR}/${name}`, content);
        }

        // Start HTTP server in the background (non-blocking).
        // Our /preview/* route serves files directly so this isn't critical.
        try {
          const exposedPorts = await sandbox.getExposedPorts(hostname);
          if (!exposedPorts.some((p) => p.port === 8080)) {
            await sandbox.startProcess('python3 -m http.server 8080', { cwd: APP_DIR });
          }
        } catch { /* best-effort */ }

        return Response.json({ status: 'ready', files: Object.keys(STARTER_FILES) });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return Response.json({ error: msg }, { status: 500 });
      }
    }

    // ── API: list files ──
    if (sub === 'api/files') {
      try {
        const sandbox = getSandbox(env.Sandbox, sandboxId);
        const listing = await sandbox.listFiles(APP_DIR, { recursive: true });
        const names = listing.files
          .filter((f) => f.type === 'file')
          .map((f) => f.relativePath);
        return Response.json({ files: names });
      } catch {
        return Response.json({ files: [] });
      }
    }

    // ── API: prompt ──
    if (sub === 'api/prompt' && request.method === 'POST') {
      try {
        const { prompt, history } = (await request.json()) as {
          prompt: string;
          history?: Array<{ role: string; content: string }>;
        };

        const sandbox = getSandbox(env.Sandbox, sandboxId);

        const listing = await sandbox.listFiles(APP_DIR, { recursive: true });
        const filePaths = listing.files
          .filter((f) => f.type === 'file')
          .map((f) => f.relativePath);

        const fileContents = await Promise.all(
          filePaths.map((name) => sandbox.readFile(`${APP_DIR}/${name}`).then((f) => ({ name, content: f.content })))
        );

        let currentSnapshot = '';
        for (const { name, content } of fileContents) {
          currentSnapshot += `===FILE: ${name}===\n${content}\n`;
        }

        const messages: Array<{ role: string; content: string }> = [
          { role: 'system', content: SYSTEM_PROMPT },
        ];
        if (history && history.length > 0) {
          for (const msg of history.slice(-4)) {
            messages.push(msg);
          }
        }
        messages.push({
          role: 'user',
          content: `CURRENT FILES:\n\n${currentSnapshot}\nUSER REQUEST: ${prompt}`,
        });

        const aiResponse = await env.AI.run(
          '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
          {
            messages: messages as RoleScopedChatInput[],
            max_tokens: 8192,
            temperature: 0.3,
          }
        );

        let rawResponse = '';
        if (typeof aiResponse === 'string') {
          rawResponse = aiResponse;
        } else if (aiResponse && typeof aiResponse === 'object' && 'response' in aiResponse) {
          rawResponse = (aiResponse as { response: string }).response;
        }

        let changedFiles = parseMultiFile(rawResponse);
        if (Object.keys(changedFiles).length === 0) {
          const singleHtml = extractSingleHtml(rawResponse);
          if (singleHtml) changedFiles = { 'index.html': singleHtml };
        }

        if (Object.keys(changedFiles).length === 0) {
          return Response.json(
            { error: 'AI returned an unparseable response. Try rephrasing your prompt.' },
            { status: 422 }
          );
        }

        const written: string[] = [];
        const deleted: string[] = [];
        for (const [name, content] of Object.entries(changedFiles)) {
          if (content.trim() === '') {
            try { await sandbox.deleteFile(`${APP_DIR}/${name}`); deleted.push(name); } catch { /* gone */ }
          } else {
            await sandbox.writeFile(`${APP_DIR}/${name}`, content);
            written.push(name);
          }
        }

        const updated = await sandbox.listFiles(APP_DIR, { recursive: true });
        const allFiles = updated.files
          .filter((f) => f.type === 'file')
          .map((f) => f.relativePath);

        return Response.json({ success: true, written, deleted, files: allFiles });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return Response.json({ error: msg }, { status: 500 });
      }
    }

    return new Response('Not found', { status: 404 });
  },
};

// ──────────────────────────────────────────────
// Dashboard HTML
// ──────────────────────────────────────────────

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sandbox Studio</title>
  <style>
    :root {
      --bg: #0b0d11;
      --surface: #14171e;
      --surface-hover: #1a1e27;
      --border: #252a35;
      --text: #e4e7ed;
      --text-dim: #7a8194;
      --accent: #6c72cb;
      --accent-bright: #8187de;
      --green: #34d399;
      --red: #f87171;
      --radius: 12px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }

    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 2rem; height: 52px;
      background: var(--surface); border-bottom: 1px solid var(--border);
    }
    .topbar .logo {
      display: flex; align-items: center; gap: 10px;
      font-weight: 700; font-size: 15px; letter-spacing: -.3px;
    }
    .topbar .logo .icon {
      width: 26px; height: 26px;
      background: linear-gradient(135deg, var(--accent), var(--accent-bright));
      border-radius: 7px; display: flex; align-items: center; justify-content: center;
      font-size: 13px; color: #fff;
    }

    .container { max-width: 860px; margin: 0 auto; padding: 3rem 1.5rem; }

    .hero { text-align: center; margin-bottom: 3rem; }
    .hero h1 {
      font-size: 2rem; font-weight: 800; letter-spacing: -.5px;
      margin-bottom: .5rem;
      background: linear-gradient(135deg, var(--accent-bright), var(--green));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .hero p { color: var(--text-dim); font-size: .95rem; max-width: 420px; margin: 0 auto 1.5rem; }

    .create-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: .75rem 1.75rem;
      background: linear-gradient(135deg, var(--accent), var(--accent-bright));
      color: #fff; border: none; border-radius: var(--radius);
      font-size: .925rem; font-weight: 600; cursor: pointer;
      transition: all .15s;
    }
    .create-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(108,114,203,.35); }
    .create-btn svg { width: 18px; height: 18px; }

    .section-label {
      font-size: .8rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: .08em; color: var(--text-dim); margin-bottom: 1rem;
    }

    .sandbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
    }

    .sandbox-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.25rem;
      cursor: pointer;
      transition: all .15s;
      position: relative;
    }
    .sandbox-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.2); }
    .sandbox-card .name {
      font-weight: 600; font-size: .95rem; margin-bottom: .25rem;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sandbox-card .id {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: .75rem; color: var(--text-dim); margin-bottom: .5rem;
    }
    .sandbox-card .meta {
      font-size: .75rem; color: var(--text-dim);
    }
    .sandbox-card .delete-btn {
      position: absolute; top: 10px; right: 10px;
      background: none; border: none; color: var(--text-dim);
      cursor: pointer; padding: 4px; border-radius: 4px;
      opacity: 0; transition: all .15s;
    }
    .sandbox-card:hover .delete-btn { opacity: 1; }
    .sandbox-card .delete-btn:hover { color: var(--red); background: rgba(248,113,113,.1); }

    .empty {
      text-align: center; padding: 3rem; color: var(--text-dim);
      border: 1px dashed var(--border); border-radius: var(--radius);
    }
    .empty p { font-size: .9rem; }

    .name-modal-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
      z-index: 100; align-items: center; justify-content: center;
    }
    .name-modal-overlay.open { display: flex; }
    .name-modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 1.75rem; width: 380px; max-width: 90vw;
    }
    .name-modal h3 { margin-bottom: .25rem; font-size: 1.05rem; }
    .name-modal p { font-size: .85rem; color: var(--text-dim); margin-bottom: 1rem; }
    .name-modal input {
      width: 100%; padding: .6rem .75rem; border: 1px solid var(--border);
      border-radius: 8px; background: var(--bg); color: var(--text);
      font-size: .9rem; outline: none; font-family: inherit;
    }
    .name-modal input:focus { border-color: var(--accent); }
    .name-modal .actions { display: flex; gap: .5rem; margin-top: 1rem; justify-content: flex-end; }
    .name-modal .btn-cancel {
      padding: .55rem 1rem; border: 1px solid var(--border); border-radius: 8px;
      background: none; color: var(--text-dim); cursor: pointer; font-size: .85rem;
    }
    .name-modal .btn-go {
      padding: .55rem 1.25rem; border: none; border-radius: 8px;
      background: var(--accent); color: #fff; cursor: pointer; font-weight: 600; font-size: .85rem;
    }
    .name-modal .btn-go:hover { background: var(--accent-bright); }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="logo">
      <div class="icon">S</div>
      Sandbox Studio
    </div>
  </div>

  <div class="container">
    <div class="hero">
      <h1>Your Sandboxes</h1>
      <p>Create isolated web app sandboxes and shape them with AI prompts.</p>
      <button class="create-btn" onclick="openCreateModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        New Sandbox
      </button>
    </div>

    <div id="listSection" style="display:none">
      <div class="section-label">Recent sandboxes</div>
      <div class="sandbox-grid" id="sandboxGrid"></div>
    </div>

    <div class="empty" id="emptyState">
      <p>No sandboxes yet. Create one to get started.</p>
    </div>
  </div>

  <div class="name-modal-overlay" id="modalOverlay">
    <div class="name-modal">
      <h3>New Sandbox</h3>
      <p>Give it a name. An ID will be generated automatically.</p>
      <input id="nameInput" placeholder="My awesome project" autofocus
             onkeydown="if(event.key==='Enter')createSandbox()">
      <div class="actions">
        <button class="btn-cancel" onclick="closeModal()">Cancel</button>
        <button class="btn-go" onclick="createSandbox()">Create</button>
      </div>
    </div>
  </div>

  <script>
    const STORAGE_KEY = 'sandbox-studio-instances';

    function loadSandboxes() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
      catch { return []; }
    }
    function saveSandboxes(list) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function slugify(name) {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'sandbox';
    }

    function makeId(name) {
      const base = slugify(name);
      const suffix = Math.random().toString(36).slice(2, 7);
      return base + '-' + suffix;
    }

    function timeAgo(ts) {
      const s = Math.floor((Date.now() - ts) / 1000);
      if (s < 60) return 'just now';
      if (s < 3600) return Math.floor(s / 60) + 'm ago';
      if (s < 86400) return Math.floor(s / 3600) + 'h ago';
      return Math.floor(s / 86400) + 'd ago';
    }

    function render() {
      const list = loadSandboxes();
      const grid = document.getElementById('sandboxGrid');
      const listSection = document.getElementById('listSection');
      const emptyState = document.getElementById('emptyState');

      if (list.length === 0) {
        listSection.style.display = 'none';
        emptyState.style.display = '';
        return;
      }

      listSection.style.display = '';
      emptyState.style.display = 'none';
      grid.innerHTML = '';

      list.sort((a, b) => b.lastOpened - a.lastOpened);

      for (const sb of list) {
        const card = document.createElement('div');
        card.className = 'sandbox-card';
        card.onclick = (e) => {
          if (e.target.closest('.delete-btn')) return;
          sb.lastOpened = Date.now();
          saveSandboxes(list);
          window.location.href = '/s/' + sb.id + '/';
        };
        card.innerHTML =
          '<div class="name">' + escHtml(sb.name) + '</div>' +
          '<div class="id">' + escHtml(sb.id) + '</div>' +
          '<div class="meta">Opened ' + timeAgo(sb.lastOpened) + '</div>' +
          '<button class="delete-btn" title="Remove" onclick="removeSandbox(\\''+sb.id+'\\')">&#10005;</button>';
        grid.appendChild(card);
      }
    }

    function escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function openCreateModal() {
      document.getElementById('modalOverlay').classList.add('open');
      const input = document.getElementById('nameInput');
      input.value = '';
      input.focus();
    }
    function closeModal() {
      document.getElementById('modalOverlay').classList.remove('open');
    }

    function createSandbox() {
      const name = document.getElementById('nameInput').value.trim() || 'Untitled';
      const id = makeId(name);
      const list = loadSandboxes();
      list.push({ id, name, created: Date.now(), lastOpened: Date.now() });
      saveSandboxes(list);
      window.location.href = '/s/' + id + '/';
    }

    function removeSandbox(id) {
      const list = loadSandboxes().filter(s => s.id !== id);
      saveSandboxes(list);
      render();
    }

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    render();
  </script>
</body>
</html>`;

// ──────────────────────────────────────────────
// Studio HTML (parameterized by sandbox ID)
// ──────────────────────────────────────────────

function studioHtml(sandboxId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sandboxId} &mdash; Sandbox Studio</title>
  <style>
    :root {
      --bg: #0b0d11;
      --surface: #14171e;
      --surface-hover: #1a1e27;
      --border: #252a35;
      --text: #e4e7ed;
      --text-dim: #7a8194;
      --accent: #6c72cb;
      --accent-bright: #8187de;
      --green: #34d399;
      --red: #f87171;
      --radius: 12px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      overflow: hidden;
    }

    .app {
      display: grid;
      grid-template-columns: 380px 1fr;
      grid-template-rows: 52px 1fr;
      height: 100vh;
    }

    header {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      gap: 12px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .back-btn {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px;
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 7px; color: var(--text-dim); cursor: pointer;
      transition: all .15s; text-decoration: none;
    }
    .back-btn:hover { color: var(--text); border-color: var(--accent); }
    header .logo {
      display: flex; align-items: center; gap: 8px;
      font-weight: 700; font-size: 14px; letter-spacing: -.3px;
    }
    header .logo .icon {
      width: 24px; height: 24px;
      background: linear-gradient(135deg, var(--accent), var(--accent-bright));
      border-radius: 6px; display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: #fff;
    }
    .sandbox-name {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px; color: var(--text-dim);
      padding: 3px 10px; background: var(--bg);
      border: 1px solid var(--border); border-radius: 6px;
    }
    .status-badge {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: var(--text-dim);
      padding: 4px 11px; background: var(--bg);
      border-radius: 20px; border: 1px solid var(--border);
    }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--text-dim);
    }
    .status-dot.active { background: var(--green); }
    .status-dot.loading {
      background: var(--accent-bright);
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

    .panel {
      display: flex; flex-direction: column;
      border-right: 1px solid var(--border);
      background: var(--surface); overflow: hidden;
    }

    .file-bar {
      display: flex; gap: 2px; padding: 8px 12px 0;
      flex-wrap: wrap; border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .file-tab {
      padding: 5px 10px; font-size: 11px;
      color: var(--text-dim); background: var(--bg);
      border: 1px solid var(--border); border-bottom: none;
      border-radius: 6px 6px 0 0; cursor: pointer;
      transition: all .15s;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .file-tab:hover { color: var(--text); }
    .file-tab.active {
      color: var(--accent-bright); background: var(--surface-hover);
      border-color: var(--accent);
    }

    .messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .messages::-webkit-scrollbar { width: 5px; }
    .messages::-webkit-scrollbar-track { background: transparent; }
    .messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

    .message {
      padding: 10px 12px; border-radius: var(--radius);
      font-size: 13px; line-height: 1.55; max-width: 95%; word-wrap: break-word;
    }
    .message.user {
      background: linear-gradient(135deg, var(--accent), var(--accent-bright));
      color: white; align-self: flex-end; border-bottom-right-radius: 4px;
    }
    .message.system {
      background: var(--bg); border: 1px solid var(--border);
      color: var(--text-dim); align-self: flex-start; border-bottom-left-radius: 4px;
    }
    .message.system .file-list {
      margin-top: 4px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px; color: var(--accent-bright);
    }
    .message.error {
      background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3);
      color: var(--red); align-self: flex-start;
    }

    .welcome {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center; padding: 28px; gap: 10px;
    }
    .welcome h2 { font-size: 17px; font-weight: 600; }
    .welcome p { font-size: 12.5px; color: var(--text-dim); line-height: 1.6; max-width: 260px; }
    .suggestions { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; width: 100%; max-width: 290px; }
    .suggestion {
      padding: 9px 12px; background: var(--bg); border: 1px solid var(--border);
      border-radius: 9px; font-size: 12.5px; color: var(--text-dim);
      cursor: pointer; transition: all .15s; text-align: left;
    }
    .suggestion:hover { background: var(--surface-hover); border-color: var(--accent); color: var(--text); }

    .input-area { padding: 12px; border-top: 1px solid var(--border); }
    .input-row { display: flex; gap: 8px; align-items: flex-end; }
    .input-row textarea {
      flex: 1; resize: none; background: var(--bg);
      border: 1px solid var(--border); border-radius: 10px;
      padding: 10px 12px; color: var(--text); font-size: 13px;
      font-family: inherit; line-height: 1.5; max-height: 120px;
      outline: none; transition: border-color .15s;
    }
    .input-row textarea:focus { border-color: var(--accent); }
    .input-row textarea::placeholder { color: var(--text-dim); }
    .send-btn {
      width: 40px; height: 40px; border: none;
      background: linear-gradient(135deg, var(--accent), var(--accent-bright));
      color: white; border-radius: 10px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .15s; flex-shrink: 0;
    }
    .send-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(108,114,203,.4); }
    .send-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
    .send-btn svg { width: 17px; height: 17px; }

    .preview {
      position: relative; background: var(--bg);
      display: flex; flex-direction: column;
    }
    .preview-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 14px; height: 38px; background: var(--surface);
      border-bottom: 1px solid var(--border);
      font-size: 11px; color: var(--text-dim); gap: 8px;
    }
    .url-input {
      flex: 1; background: var(--bg); border: 1px solid var(--border);
      border-radius: 6px; padding: 4px 10px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 11px; color: var(--text-dim); outline: none;
    }
    .url-input:focus { border-color: var(--accent); color: var(--text); }
    .preview-actions { display: flex; gap: 4px; }
    .icon-btn {
      background: none; border: none; color: var(--text-dim);
      cursor: pointer; padding: 4px; border-radius: 4px;
      transition: all .15s; display: flex; align-items: center;
    }
    .icon-btn:hover { color: var(--text); background: var(--bg); }
    .preview iframe { flex: 1; width: 100%; border: none; background: white; }

    .loading-overlay {
      position: absolute; inset: 38px 0 0 0;
      background: rgba(11,13,17,.85);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 14px; z-index: 10; backdrop-filter: blur(4px);
    }
    .loading-overlay.hidden { display: none; }
    .spinner {
      width: 28px; height: 28px; border: 3px solid var(--border);
      border-top-color: var(--accent-bright); border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-overlay p { font-size: 12px; color: var(--text-dim); }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <div class="header-left">
        <a href="/" class="back-btn" title="All sandboxes">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </a>
        <div class="logo">
          <div class="icon">S</div>
          Studio
        </div>
        <div class="sandbox-name">${sandboxId}</div>
      </div>
      <div class="status-badge">
        <div class="status-dot" id="statusDot"></div>
        <span id="statusText">Connecting...</span>
      </div>
    </header>

    <div class="panel">
      <div class="file-bar" id="fileBar"></div>
      <div class="messages" id="messages">
        <div class="welcome" id="welcome">
          <h2>Web App Sandbox</h2>
          <p>Describe changes to the multi-page app, add pages, restyle &mdash; anything goes.</p>
          <div class="suggestions">
            <div class="suggestion" onclick="useSuggestion(this)">Change the colour scheme to dark mode with neon accents</div>
            <div class="suggestion" onclick="useSuggestion(this)">Add a blog page with three sample posts</div>
            <div class="suggestion" onclick="useSuggestion(this)">Redesign the home page as a SaaS landing page with pricing cards</div>
          </div>
        </div>
      </div>
      <div class="input-area">
        <div class="input-row">
          <textarea id="promptInput" rows="1" placeholder="Describe a change..."
            onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
          <button class="send-btn" id="sendBtn" onclick="sendPrompt()" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13"></path>
              <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="preview">
      <div class="preview-bar">
        <input class="url-input" id="urlInput" value="preview/" spellcheck="false"
               onkeydown="if(event.key==='Enter'){navigatePreview(this.value)}">
        <div class="preview-actions">
          <button class="icon-btn" onclick="navigatePreview(document.getElementById('urlInput').value)" title="Go">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </button>
          <button class="icon-btn" onclick="reloadPreview()" title="Reload">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
          </button>
        </div>
      </div>
      <iframe id="previewFrame" src="about:blank"></iframe>
      <div class="loading-overlay" id="loadingOverlay">
        <div class="spinner"></div>
        <p id="loadingText">Starting sandbox...</p>
      </div>
    </div>
  </div>

  <script>
    const SANDBOX_ID = '${sandboxId}';
    const BASE = '/s/' + SANDBOX_ID + '/';

    let generating = false;
    const history = [];
    let currentFiles = [];

    const els = Object.fromEntries(
      ['messages','welcome','promptInput','sendBtn','previewFrame',
       'loadingOverlay','loadingText','statusDot','statusText',
       'urlInput','fileBar'].map(id => [id, document.getElementById(id)])
    );

    els.promptInput.addEventListener('input', () => {
      els.sendBtn.disabled = !els.promptInput.value.trim() || generating;
    });

    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
    function handleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrompt(); }
    }
    function useSuggestion(el) {
      els.promptInput.value = el.textContent;
      els.sendBtn.disabled = false;
      els.promptInput.focus();
      sendPrompt();
    }

    function addMessage(text, type, fileList) {
      if (els.welcome) els.welcome.style.display = 'none';
      const div = document.createElement('div');
      div.className = 'message ' + type;
      div.textContent = text;
      if (fileList && fileList.length) {
        const fl = document.createElement('div');
        fl.className = 'file-list';
        fl.textContent = fileList.join(', ');
        div.appendChild(fl);
      }
      els.messages.appendChild(div);
      els.messages.scrollTop = els.messages.scrollHeight;
    }

    function setStatus(state, text) {
      els.statusDot.className = 'status-dot ' + state;
      els.statusText.textContent = text;
    }
    function showLoading(text) {
      els.loadingText.textContent = text;
      els.loadingOverlay.classList.remove('hidden');
    }
    function hideLoading() { els.loadingOverlay.classList.add('hidden'); }

    function renderFileTabs(files) {
      currentFiles = files;
      els.fileBar.innerHTML = '';
      files.forEach(f => {
        const tab = document.createElement('div');
        tab.className = 'file-tab';
        tab.textContent = f;
        tab.onclick = () => navigatePreview('preview/' + f);
        els.fileBar.appendChild(tab);
      });
    }

    function navigatePreview(path) {
      if (!path.startsWith('preview')) path = 'preview/' + path.replace(/^\\/+/, '');
      els.urlInput.value = path;
      const fullUrl = BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now();
      els.previewFrame.src = fullUrl;
      document.querySelectorAll('.file-tab').forEach(t => {
        t.classList.toggle('active', path.includes(t.textContent));
      });
    }

    function reloadPreview() {
      const path = els.urlInput.value || 'preview/';
      const fullUrl = BASE + path + (path.includes('?') ? '&' : '?') + '_t=' + Date.now();
      els.previewFrame.src = fullUrl;
    }

    async function initSandbox(attempt) {
      attempt = attempt || 1;
      const MAX = 3;
      setStatus('loading', 'Starting sandbox...');
      showLoading(attempt > 1
        ? 'Container is booting, retrying (' + attempt + '/' + MAX + ')...'
        : 'Starting sandbox container...');
      try {
        const res = await fetch(BASE + 'api/init', { method: 'POST' });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        renderFileTabs(data.files || []);
        navigatePreview('preview/');
        setStatus('active', 'Sandbox ready');
        hideLoading();
      } catch (err) {
        if (attempt < MAX) {
          await new Promise(r => setTimeout(r, 3000 * attempt));
          return initSandbox(attempt + 1);
        }
        setStatus('', 'Error');
        showLoading('Failed to start: ' + err.message);
      }
    }

    async function doPromptRequest(prompt) {
      const res = await fetch(BASE + 'api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, history: history.slice(-6) }),
      });
      if (!res.ok && res.status >= 500) throw new Error('Server error (' + res.status + ')');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    }

    async function sendPrompt() {
      const prompt = els.promptInput.value.trim();
      if (!prompt || generating) return;
      generating = true;
      els.sendBtn.disabled = true;
      els.promptInput.value = '';
      els.promptInput.style.height = 'auto';
      addMessage(prompt, 'user');
      history.push({ role: 'user', content: prompt });
      setStatus('loading', 'Generating...');
      showLoading('AI is updating your app...');

      let data = null;
      let lastErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          if (attempt > 1) showLoading('Retrying (' + attempt + '/2)...');
          data = await doPromptRequest(prompt);
          break;
        } catch (err) {
          lastErr = err;
          if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (data) {
        const changedFiles = [...(data.written||[]), ...(data.deleted||[]).map(f => f+' (deleted)')];
        history.push({ role: 'assistant', content: 'Updated: ' + changedFiles.join(', ') });
        addMessage('Updated ' + changedFiles.length + ' file(s)', 'system', changedFiles);
        if (data.files) renderFileTabs(data.files);
        setStatus('active', 'Sandbox ready');
        reloadPreview();
        hideLoading();
      } else {
        addMessage('Error: ' + (lastErr ? lastErr.message : 'Unknown error'), 'error');
        setStatus('active', 'Sandbox ready');
        hideLoading();
      }
      generating = false;
      els.sendBtn.disabled = !els.promptInput.value.trim();
    }

    initSandbox();
  </script>
</body>
</html>`;
}
