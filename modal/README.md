# Modal + Convex (Next.js project)

This folder contains a [Modal](https://modal.com) app for the Synapse repo (Next.js + Convex). You can run code on Modal’s servers and call Convex with a shared secret.

---

## First time: get Modal running (no Convex yet)

Follow these steps once to install Modal and run your first remote function.

### 1. Install the Modal client

From the repo root or from `modal/`:

```bash
pip install modal
```

(Or use the project deps: `pip install -r modal/requirements.txt`.)

### 2. Log in and create an API token

```bash
python -m modal setup
```

A browser tab will open to authenticate; you can close it when done.

### 3. Run the minimal example

Use `python -m modal` so the CLI works on Windows (even if `modal` isn’t on PATH).

From the repo root:

```bash
python -m modal run modal/app.py
```

Or from inside `modal/`:

```bash
cd modal
python -m modal run app.py
```

You should see something like:

```
The square is 1764
```

That means a function ran on Modal’s infrastructure. Next, connect Convex so the app can talk to your backend.

---

## Connect Convex: shared secret and HTTP routes

### 0a. (Optional) Use Next.js API instead of Convex HTTP

You can avoid deploying Convex HTTP routes by using **Next.js API routes** at `/api/modal/ping`, `/api/modal/tasks`, `/api/modal/complete`. They’re already in this repo. Deploy your Next.js app (e.g. to Vercel), set `MODAL_SERVICE_SECRET` in the host’s environment, then in step 3 use **Option A** (MODAL_API_URL = your deployed app URL). The worker will call your Next app instead of Convex.

### 0b. (Optional) Deploy Convex HTTP routes

If you prefer Convex HTTP: push so `/modal/ping` etc. are live on your Convex site:

```bash
cd <repo-root>
npx convex dev
```

Let it run until it has pushed (then Ctrl+C). This deploys the Modal routes in `convex/http.ts` to your dev deployment.

### 1. Convex: set the shared secret

1. Open your [Convex dashboard](https://dashboard.convex.dev) → your project → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `MODAL_SERVICE_SECRET`
   - **Value:** a long random string (e.g. `openssl rand -hex 32`). Use the same value in Modal in step 2.

## 2. Convex: get your deployment URL

In the same Convex **Settings** page, copy the **Deployment URL** (e.g. `https://your-deployment.convex.cloud`). You’ll need it for Modal.

## 3. Modal: create a secret

**Option A – Use Next.js API (recommended, no Convex HTTP deploy needed)**  
Deploy your Next.js app (e.g. Vercel), set `MODAL_SERVICE_SECRET` in the host’s env, then create the secret with your app URL:

```bash
cd modal
python -m modal secret create convex-modal-secrets MODAL_API_URL=https://your-app.vercel.app MODAL_SERVICE_SECRET=<same-value>
```

**Option B – Use Convex HTTP routes**  
After pushing with `npx convex dev`, use the Convex site URL:

```bash
python -m modal secret create convex-modal-secrets CONVEX_SITE_URL=https://your-deployment.convex.site MODAL_SERVICE_SECRET=<same-value>
```

In the [Modal dashboard](https://modal.com/secrets), create a secret named `convex-modal-secrets` with the keys you chose above.

### If you get 404 when running the worker

The worker is calling Convex and the `/modal/*` routes aren’t deployed there yet. Do one of the following:

- **Use the Next.js API:** Deploy your Next app (e.g. `vercel`), set `MODAL_SERVICE_SECRET` in the host’s env, then **recreate** the Modal secret with **only** `MODAL_API_URL` and `MODAL_SERVICE_SECRET` (remove `CONVEX_URL` / `CONVEX_SITE_URL`):
  ```bash
  python -m modal secret create convex-modal-secrets MODAL_API_URL=https://YOUR-DEPLOYED-APP.vercel.app MODAL_SERVICE_SECRET=<your-secret>
  ```
- **Or push Convex:** In the repo root run `npx convex dev` and wait until it finishes pushing so the Convex HTTP routes are live.

## 4. Run the Convex worker

After creating the `convex-modal-secrets` secret (step 3), run the inference worker:

```bash
cd modal
python -m modal run worker.py
```

To deploy so the worker can run on a schedule or be triggered remotely:

```bash
cd modal
python -m modal deploy worker.py
```

Then in the Modal dashboard you can add a schedule (e.g. every 5 minutes) to the `run_inference_worker` function.

## Flow

- **Convex** exposes public functions in `convex/modal.ts` that require `serviceSecret` in the request. They compare it to `process.env.MODAL_SERVICE_SECRET` and throw if it doesn’t match.
- **Modal** reads `CONVEX_URL` and `MODAL_SERVICE_SECRET` from Modal Secrets and passes the secret in the `args` of every Convex HTTP API call.

No user JWT is involved; the Modal server authenticates as a service using the shared secret.

## Extending

- **Tasks:** Implement real task storage in Convex (e.g. a `tasks` table), and in `convex/modal.ts` have `getInferenceTasks` return pending tasks and `completeInferenceTask` update the task and store the result.
- **Inference:** In `modal/app.py`, replace the placeholder in `run_inference_worker` with your actual inference (e.g. call an LLM for summarization/translation), then call `completeInferenceTask` with the result.
