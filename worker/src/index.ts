import { getSandbox, proxyToSandbox } from '@cloudflare/sandbox';
import { STARTER_FILES, STUDIO_HTML } from './starterFiles.generated';

export { Sandbox } from '@cloudflare/sandbox';

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

function corsHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return headers;
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: corsHeaders(init?.headers),
  });
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
const SUPERMEMORY_API = 'https://api.supermemory.ai/v3';

function storeMemory(
  apiKey: string,
  sandboxId: string,
  prompt: string,
  written: string[],
  deleted: string[],
  changedFiles: Record<string, string>,
): Promise<void> {
  let content = `PROMPT: ${prompt}\n`;
  content += `FILES WRITTEN: ${written.length ? written.join(', ') : 'none'}\n`;
  content += `FILES DELETED: ${deleted.length ? deleted.join(', ') : 'none'}\n`;
  for (const name of written) {
    const body = changedFiles[name];
    if (body) content += `===FILE: ${name}===\n${body}\n`;
  }

  return fetch(`${SUPERMEMORY_API}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      containerTag: `sandbox_${sandboxId}`,
      customId: `change_${sandboxId}_${Date.now()}`,
      metadata: {
        sandboxId,
        filesWritten: written.length,
        filesDeleted: deleted.length,
        timestamp: Date.now(),
      },
    }),
  }).then(() => { }).catch(() => { });
}

async function searchMemories(
  apiKey: string,
  sandboxId: string,
  query: string,
): Promise<string> {
  try {
    const res = await fetch(`${SUPERMEMORY_API}/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        containerTags: [`sandbox_${sandboxId}`],
        limit: 3,
      }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as {
      results?: Array<{ content?: string; memory?: string }>;
    };
    if (!data.results?.length) return '';
    return data.results
      .map((r) => r.memory || r.content || '')
      .filter(Boolean)
      .join('\n---\n');
  } catch {
    return '';
  }
}

// ──────────────────────────────────────────────
// Worker
// ──────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const proxyResponse = await proxyToSandbox(request, env);
    if (proxyResponse) return proxyResponse;

    const url = new URL(request.url);
    const { hostname } = url;

    // ── Root: dashboard is served by Next.js ──
    if (url.pathname === '/' || url.pathname === '') {
      return new Response('Not found', { status: 404 });
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

    // ── CORS preflight for API routes ──
    if (request.method === 'OPTIONS' && sub.startsWith('api/')) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

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

        let existingFiles: string[] = [];
        try {
          const listing = await sandbox.listFiles(APP_DIR, { recursive: true });
          existingFiles = listing.files
            .filter((f) => f.type === 'file')
            .map((f) => f.relativePath);
        } catch { /* directory may not exist yet */ }

        if (existingFiles.length === 0) {
          for (const [name, content] of Object.entries(STARTER_FILES)) {
            await sandbox.writeFile(`${APP_DIR}/${name}`, content);
          }
          existingFiles = Object.keys(STARTER_FILES);
        }

        // Start HTTP server in the background (non-blocking).
        // Our /preview/* route serves files directly so this isn't critical.
        try {
          const exposedPorts = await sandbox.getExposedPorts(hostname);
          if (!exposedPorts.some((p) => p.port === 8080)) {
            await sandbox.startProcess('python3 -m http.server 8080', { cwd: APP_DIR });
          }
        } catch { /* best-effort */ }

        return json({ status: 'ready', files: existingFiles });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return json({ error: msg }, { status: 500 });
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
        return json({ files: names });
      } catch {
        return json({ files: [] });
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

        let memoryContext = '';
        const smKey = (env as unknown as Record<string, unknown>).SUPERMEMORY_API_KEY as string | undefined;
        if (smKey) {
          memoryContext = await searchMemories(smKey, sandboxId, prompt);
        }

        const systemContent = memoryContext
          ? `${SYSTEM_PROMPT}\n\nPREVIOUS CHANGES IN THIS SANDBOX (for context):\n${memoryContext}`
          : SYSTEM_PROMPT;

        const messages: Array<{ role: string; content: string }> = [
          { role: 'system', content: systemContent },
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
          return json(
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

        if (smKey) {
          ctx.waitUntil(storeMemory(smKey, sandboxId, prompt, written, deleted, changedFiles));
        }

        return json({ success: true, written, deleted, files: allFiles });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return json({ error: msg }, { status: 500 });
      }
    }

    // ── API: export all file contents ──
    if (sub === 'api/export') {
      try {
        const sandbox = getSandbox(env.Sandbox, sandboxId);
        const listing = await sandbox.listFiles(APP_DIR, { recursive: true });
        const filePaths = listing.files
          .filter((f) => f.type === 'file')
          .map((f) => f.relativePath);

        const fileMap: Record<string, string> = {};
        await Promise.all(
          filePaths.map(async (name) => {
            const f = await sandbox.readFile(`${APP_DIR}/${name}`);
            fileMap[name] = f.content;
          }),
        );

        return json({ files: fileMap });
      } catch {
        return json({ files: {} });
      }
    }

    return new Response('Not found', { status: 404 });
  },
};

function studioHtml(sandboxId: string): string {
  return STUDIO_HTML.replaceAll('{{SANDBOX_ID}}', sandboxId);
}
