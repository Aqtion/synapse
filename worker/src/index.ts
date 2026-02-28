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

// PostHog: official stub (s.api_host = config) + listener. Parent sends POSTHOG_INIT via postMessage (no key in URL).
// This script is injected into studio HTML before </head>. Marker: SANDBOX_POSTHOG_SCRIPT_LOADED
// Stub from PostHog docs: init(i,s,a) with s = config (so use init(apiKey, config) with 2 args).
const POSTHOG_LISTENER_SCRIPT =
  '<script>\n' +
  '!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=(s&&s.api_host?s.api_host:"https://us.i.posthog.com").replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);\n' +
  'if(window.parent!==window)window.parent.postMessage({type:"SANDBOX_POSTHOG_SCRIPT_LOADED"},"*");\n' +
  'function stopRecording(){try{if(window.posthog&&window.posthog.stopSessionRecording)window.posthog.stopSessionRecording();var pf=document.getElementById("previewFrame");if(pf&&pf.contentWindow)pf.contentWindow.postMessage({type:"POSTHOG_STOP"},"*");}catch(e){}}\n' +
  'window.addEventListener("message",function(ev){var d=ev.data;if(!d||!d.type)return;if(d.type==="POSTHOG_INIT"){var isPreview=!!d.isPreview;var cfg={api_host:d.apiHost||"https://us.i.posthog.com",person_profiles:"identified_only",session_recording:isPreview?{maskAllInputs:!0}:{disabled:!0},autocapture:!0,capture_rage_clicks:!0,capture_dead_clicks:!0};window.posthog.init(d.apiKey,cfg);window.posthog.register({sandboxId:d.sandboxId});window.posthog.capture("sandbox_session_started",{sandboxId:d.sandboxId});if(!isPreview){window.__POSTHOG_PREVIEW_CONFIG__={apiKey:d.apiKey,apiHost:d.apiHost||"https://us.i.posthog.com",sandboxId:d.sandboxId};try{var pf=document.getElementById("previewFrame");if(pf&&pf.contentWindow)pf.contentWindow.postMessage({type:"POSTHOG_INIT",apiKey:d.apiKey,apiHost:d.apiHost,sandboxId:d.sandboxId,isPreview:!0},"*");}catch(e){}if(window.parent!==window)window.parent.postMessage({type:"POSTHOG_IFRAME_INITED"},"*");}}else if(d.type==="POSTHOG_STOP"){stopRecording();}});\n' +
  'window.addEventListener("pagehide",stopRecording);\n' +
  'document.addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")stopRecording();});\n' +
  '</script>';
const SUPERMEMORY_API = 'https://api.supermemory.ai/v3';
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta';

const GEMINI_REFINE_SYSTEM_PROMPT = `You are a prompt refiner for a code-generation AI. You receive raw user input from voice (TTS) or chat.

Your job: turn it into a single, clear, actionable instruction for a frontend web developer AI. Rules:
- Remove filler words, hesitations, repetition, and off-topic phrases (e.g. "um", "like", "you know", "so basically").
- Keep the request concise. One or two short sentences is enough.
- Preserve the user's intent exactly. Do not add or remove features they asked for.
- Output ONLY the refined instruction, no preamble, no quotes, no "The user wants..." — just the instruction.`;

async function refinePromptWithGemini(apiKey: string, userPrompt: string): Promise<string> {
  const trimmed = userPrompt.trim();
  if (!trimmed) return trimmed;
  try {
    const url = `${GEMINI_API}/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: GEMINI_REFINE_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: trimmed }] }],
        generationConfig: { maxOutputTokens: 256, temperature: 0.2 },
      }),
    });
    if (!res.ok) return trimmed;
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || trimmed;
  } catch {
    return trimmed;
  }
}

function storeMemory(
  apiKey: string,
  sandboxId: string,
  prompt: string,
  written: string[],
  deleted: string[],
  changedFiles: Record<string, string>,
): Promise<void> {
  const MAX_FILE_CHARS = 2000;
  let content = `PROMPT: ${prompt}\n`;
  content += `FILES WRITTEN: ${written.length ? written.join(', ') : 'none'}\n`;
  content += `FILES DELETED: ${deleted.length ? deleted.join(', ') : 'none'}\n`;
  for (const name of written) {
    const body = changedFiles[name];
    if (body) {
      const snippet = body.length > MAX_FILE_CHARS ? body.slice(0, MAX_FILE_CHARS) + '\n...(truncated)' : body;
      content += `===FILE: ${name}===\n${snippet}\n`;
    }
  }

  // customId: alphanumeric + hyphens + underscores only, max 100 chars
  const safeId = `chg_${sandboxId}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
  const containerTag = `sandbox_${sandboxId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);

  const payload = { content, containerTag, customId: safeId };
  console.log(`[storeMemory] sending — containerTag:${containerTag} customId:${safeId} contentLen:${content.length}`);

  return fetch(`${SUPERMEMORY_API}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    const body = await res.text();
    if (!res.ok) console.error(`[storeMemory] failed ${res.status}:`, body);
    else console.log(`[storeMemory] ok ${res.status}:`, body.slice(0, 100));
  }).catch((e) => {
    console.error('[storeMemory] fetch error:', e instanceof Error ? e.message : String(e));
  });
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
        containerTags: [`sandbox_${sandboxId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)],
        limit: 3,
      }),
    });
    if (!res.ok) return '';
    const data = (await res.json()) as {
      results?: Array<{ chunks?: Array<{ content: string; isRelevant: boolean }> }>;
    };
    if (!data.results?.length) return '';
    return data.results
      .flatMap((r) => (r.chunks ?? []).filter((c) => c.isRelevant).map((c) => c.content))
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
      return new Response(studioHtml(sandboxId, env as unknown as Record<string, string | undefined>), {
        headers: corsHeaders({ 'Content-Type': 'text/html; charset=utf-8' }),
      });
    }

    // ── Preview: serve files from this sandbox (inject PostHog into HTML so preview iframe records) ──
    if (sub.startsWith('preview')) {
      try {
        const sandbox = getSandbox(env.Sandbox, sandboxId);
        let filePath = sub.replace(/^preview\/?/, '') || 'index.html';
        if (filePath.endsWith('/')) filePath += 'index.html';
        const file = await sandbox.readFile(`${APP_DIR}/${filePath}`);
        let content = file.content;
        const isHtml =
          filePath.endsWith('.html') ||
          filePath.endsWith('.htm') ||
          (typeof content === 'string' && (content.trimStart().toLowerCase().startsWith('<!doctype') || content.trimStart().toLowerCase().startsWith('<html')));
        if (isHtml && typeof content === 'string') {
          content = content.includes('</head>')
            ? content.replace('</head>', POSTHOG_LISTENER_SCRIPT + '\n</head>')
            : content.replace(/<body(\s[^>]*)?>/i, POSTHOG_LISTENER_SCRIPT + '\n<body$1>');
        }
        return new Response(content, {
          headers: corsHeaders({ 'Content-Type': mimeFor(filePath) }),
        });
      } catch {
        return new Response('File not found', { status: 404 });
      }
    }

    // ── API: init ──
    if (sub === 'api/init' && request.method === 'POST') {
      const step = { name: 'mkdir' };
      try {
        const sandbox = getSandbox(env.Sandbox, sandboxId);
        await sandbox.mkdir(APP_DIR, { recursive: true });

        step.name = 'listFiles';
        let existingFiles: string[] = [];
        try {
          const listing = await sandbox.listFiles(APP_DIR, { recursive: true });
          existingFiles = listing.files
            .filter((f) => f.type === 'file')
            .map((f) => f.relativePath);
        } catch { /* directory may not exist yet */ }

        if (existingFiles.length === 0) {
          for (const [name, content] of Object.entries(STARTER_FILES)) {
            step.name = `writeFile:${name}`;
            await sandbox.writeFile(`${APP_DIR}/${name}`, content);
          }
          existingFiles = Object.keys(STARTER_FILES);
        }

        // Start HTTP server in the background (non-blocking).
        // Our /preview/* route serves files directly so this isn't critical.
        step.name = 'startServer';
        try {
          const exposedPorts = await sandbox.getExposedPorts(hostname);
          if (!exposedPorts.some((p) => p.port === 8080)) {
            await sandbox.startProcess('python3 -m http.server 8080', { cwd: APP_DIR });
          }
        } catch { /* best-effort */ }

        return json({ status: 'ready', files: existingFiles });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return json({ error: `[step:${step.name}] ${msg}` }, { status: 500 });
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

    // ── API: refine prompt (Gemini) ──
    if (sub === 'api/refine' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { prompt?: string };
        const raw = typeof body.prompt === 'string' ? body.prompt.trim() : '';
        const geminiKey = (env as unknown as Record<string, unknown>).GEMINI_API_KEY as string | undefined;
        const refined = geminiKey ? await refinePromptWithGemini(geminiKey, raw) : raw;
        return json({ refinedPrompt: refined || raw });
      } catch {
        return json({ refinedPrompt: '' });
      }
    }

    // ── API: prompt ──
    if (sub === 'api/prompt' && request.method === 'POST') {
      try {
        const { prompt, history, refinedPrompt: bodyRefined } = (await request.json()) as {
          prompt: string;
          history?: Array<{ role: string; content: string }>;
          refinedPrompt?: string;
        };

        const geminiKey = (env as unknown as Record<string, unknown>).GEMINI_API_KEY as string | undefined;
        const promptToUse =
          typeof bodyRefined === 'string' && bodyRefined.length > 0
            ? bodyRefined.trim()
            : geminiKey
              ? await refinePromptWithGemini(geminiKey, prompt)
              : prompt;

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
          memoryContext = await searchMemories(smKey, sandboxId, promptToUse);
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
          content: `CURRENT FILES:\n\n${currentSnapshot}\nUSER REQUEST: ${promptToUse}`,
        });

        let aiResponse;
        try {
          aiResponse = await env.AI.run(
            '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
            {
              messages: messages as RoleScopedChatInput[],
              max_tokens: 8192,
              temperature: 0.3,
            }
          );
        } catch (aiErr: unknown) {
          const aiMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
          return json({ error: `AI model error: ${aiMsg}` }, { status: 500 });
        }

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
          ctx.waitUntil(storeMemory(smKey, sandboxId, promptToUse, written, deleted, changedFiles));
        }

        return json({ success: true, written, deleted, files: allFiles, refinedPrompt: promptToUse });
      } catch (error: unknown) {
        const msg = error instanceof Error
          ? `${error.constructor.name}: ${error.message}${error.stack ? '\n' + error.stack : ''}`
          : String(error);
        return json({ error: msg }, { status: 500 });
      }
    }

    // ── API: upload files (bulk write, replaces all existing files) ──
    if (sub === 'api/upload' && request.method === 'POST') {
      const step = { name: 'parse' };
      try {
        const { files } = (await request.json()) as { files: Record<string, string> };
        if (!files || typeof files !== 'object') {
          return json({ error: 'Expected { files: { [name]: content } }' }, { status: 400 });
        }
        const sandbox = getSandbox(env.Sandbox, sandboxId);

        step.name = 'mkdir';
        await sandbox.mkdir(APP_DIR, { recursive: true });

        // Clear existing files (best-effort — skip on fresh sandbox)
        step.name = 'listFiles';
        try {
          const listing = await sandbox.listFiles(APP_DIR, { recursive: true });
          step.name = 'deleteFiles';
          await Promise.all(
            listing.files
              .filter((f) => f.type === 'file')
              .map((f) => sandbox.deleteFile(`${APP_DIR}/${f.relativePath}`).catch(() => {}))
          );
        } catch { /* directory may be empty on fresh sandbox */ }

        // Write new files, creating subdirs as needed
        step.name = 'writeFiles';
        const fileNames = Object.keys(files);
        const subdirs = [...new Set(
          fileNames.map((n) => n.includes('/') ? `${APP_DIR}/${n.slice(0, n.lastIndexOf('/'))}` : null).filter(Boolean)
        )] as string[];
        for (const dir of subdirs) {
          await sandbox.mkdir(dir, { recursive: true }).catch(() => {});
        }
        for (const [name, content] of Object.entries(files)) {
          step.name = `writeFile:${name}`;
          await sandbox.writeFile(`${APP_DIR}/${name}`, content);
        }

        // Start HTTP server if not already running (best-effort)
        step.name = 'startServer';
        try {
          const exposedPorts = await sandbox.getExposedPorts(request.headers.get('host') ?? '');
          if (!exposedPorts.some((p) => p.port === 8080)) {
            await sandbox.startProcess('python3 -m http.server 8080', { cwd: APP_DIR });
          }
        } catch { /* non-critical */ }

        return json({ ok: true, files: Object.keys(files) });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return json({ error: `[step:${step.name}] ${msg}` }, { status: 500 });
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

function studioHtml(sandboxId: string, env: Record<string, string | undefined>): string {
  const dashboardUrl = (env.DASHBOARD_URL ?? '').replace(/\/$/, '') || 'http://localhost:3000';
  return STUDIO_HTML
    .replaceAll('{{SANDBOX_ID}}', sandboxId)
    .replaceAll('{{DASHBOARD_URL}}', dashboardUrl)
    .replace('</head>', POSTHOG_LISTENER_SCRIPT + '\n</head>');
}
