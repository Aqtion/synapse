"""
Modal client: calls service-auth endpoints (Next.js API or Convex site) with shared secret.

Option A – Next.js API (works without Convex HTTP deploy):
  Set MODAL_API_URL (e.g. https://your-app.vercel.app) and MODAL_SERVICE_SECRET in Modal Secrets.

Option B – Convex HTTP routes (after pushing convex/http.ts):
  Set CONVEX_SITE_URL or CONVEX_URL and MODAL_SERVICE_SECRET in Modal Secrets.
"""

from __future__ import annotations

import os
from typing import Any

import requests


def get_base_url() -> tuple[str, str]:
    """
    Returns (base_url, path_prefix).
    MODAL_API_URL -> Next.js API: prefix "/api/modal"
    Else Convex site: prefix "/modal"
    """
    api_url = os.environ.get("MODAL_API_URL")
    if api_url:
        return api_url.rstrip("/"), "/api/modal"
    site = os.environ.get("CONVEX_SITE_URL")
    if site:
        return site.rstrip("/"), "/modal"
    url = os.environ.get("CONVEX_URL")
    if not url:
        raise ValueError(
            "Set MODAL_API_URL (Next.js) or CONVEX_SITE_URL/CONVEX_URL (Convex) in Modal Secrets"
        )
    return url.rstrip("/").replace(".convex.cloud", ".convex.site"), "/modal"


def get_service_secret() -> str:
    secret = os.environ.get("MODAL_SERVICE_SECRET")
    if not secret:
        raise ValueError("MODAL_SERVICE_SECRET not set (e.g. in Modal Secrets)")
    return secret


def _post(path_suffix: str, body: dict[str, Any]) -> dict[str, Any]:
    base, prefix = get_base_url()
    url = f"{base}{prefix}{path_suffix}"
    resp = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=30)
    if resp.status_code == 404:
        if not os.environ.get("MODAL_API_URL"):
            raise RuntimeError(
                "404 from Convex – routes not deployed. Either run 'npx convex dev' to push "
                "HTTP routes, or use the Next.js API: set MODAL_API_URL in Modal Secrets to your "
                "deployed Next app URL (e.g. https://your-app.vercel.app) and recreate the secret."
            )
        raise RuntimeError(f"404 from {url} – is MODAL_API_URL correct and the app deployed?")
    resp.raise_for_status()
    return resp.json()


def modal_ping(secret: str) -> dict[str, Any]:
    """POST ping - verify connectivity and secret."""
    return _post("/ping", {"serviceSecret": secret})


def modal_tasks(secret: str) -> list[dict[str, Any]]:
    """POST tasks - fetch inference tasks (stub returns [])."""
    return _post("/tasks", {"serviceSecret": secret}) or []


def modal_complete(secret: str, task_id: str, result: Any) -> dict[str, Any]:
    """POST complete - mark task complete."""
    return _post("/complete", {"serviceSecret": secret, "taskId": task_id, "result": result})
