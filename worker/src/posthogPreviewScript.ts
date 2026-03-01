/**
 * PostHog session recording in the sandbox preview iframe.
 *
 * This script is injected into every preview HTML response. It:
 * - Listens for POSTHOG_INIT (from studio) and inits PostHog with session recording.
 * - Listens for POSTHOG_STOP (from parent dashboard) and stops recording.
 * - Stops recording on this frame’s beforeunload / pagehide / visibilitychange so the
 *   session ends and replay data is sent when the user closes the tab or switches away,
 *   even if the parent’s postMessage never arrives. PostHog uses sendBeacon on unload.
 *
 * Replay may take a few minutes to appear in the PostHog portal after the session ends.
 */

const SCRIPT_PARTS = [
  "(function(){",
  "window.__posthogPreviewReady=false;",
  "window.__posthogStopped=false;",
  "function stopAndFlush(){",
  "  if(window.__posthogStopped)return;",
  "  window.__posthogStopped=true;",
  "  if(window.posthog){",
  "    try{window.posthog.stopSessionRecording();}catch(e){}",
  "    try{if(window.posthog.flush)window.posthog.flush();}catch(e){}",
  "  }",
  "}",
  "function attachUnloadListeners(){",
  "  window.addEventListener('beforeunload',stopAndFlush);",
  "  window.addEventListener('pagehide',stopAndFlush);",
  "  document.addEventListener('visibilitychange',function(){",
  "    if(document.visibilityState==='hidden')stopAndFlush();",
  "  });",
  "}",
  "window.addEventListener('message',function(e){",
  "  var d=e.data;if(!d||!d.type)return;",
  "  if(d.type==='POSTHOG_STOP'){stopAndFlush();return;}",
  "  if(d.type==='POSTHOG_INIT'&&d.apiKey&&d.apiHost){",
  "    if(window.__posthogPreviewReady)return;",
  "    var apiHost=(d.apiHost||'https://us.i.posthog.com').replace(/\\/$/,'');",
  "    var s=document.createElement('script');",
  "    s.crossOrigin='anonymous';s.async=true;",
  "    s.src=apiHost.replace('.i.posthog.com','-assets.i.posthog.com')+'/static/array.js';",
  "    s.onload=function(){",
  "      window.posthog.init(d.apiKey,{",
  "        api_host:apiHost,",
  "        person_profiles:'identified_only',",
  "        session_recording:{maskAllInputs:true}",
  "      });",
  "      if(d.sandboxId)window.posthog.register({sandbox_id:d.sandboxId});",
  "      window.__posthogPreviewReady=true;",
  "      attachUnloadListeners();",
  "    };",
  "    document.head.appendChild(s);",
  "  }",
  "});",
  "})();",
];

export const POSTHOG_LISTENER_SCRIPT = SCRIPT_PARTS.join("");

const SCRIPT_TAG = `<script>${POSTHOG_LISTENER_SCRIPT}</script>`;

/**
 * Injects the PostHog listener script into preview HTML so the iframe can
 * receive POSTHOG_INIT/POSTHOG_STOP and stop recording on unload.
 */
export function injectPostHogIntoHtml(html: string): string {
  if (html.includes("</head>")) {
    return html.replace("</head>", `${SCRIPT_TAG}\n</head>`);
  }
  if (html.includes("<body>")) {
    return html.replace("<body>", `<body>\n${SCRIPT_TAG}`);
  }
  return SCRIPT_TAG + "\n" + html;
}
