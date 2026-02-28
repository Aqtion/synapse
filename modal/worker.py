"""
Convex worker: run with secrets set.
  python -m modal run worker.py
"""
import os
import modal

app = modal.App("synapse-modal-worker")

modal_dir = os.path.dirname(os.path.abspath(__file__))
worker_image = (
    modal.Image.debian_slim()
    .pip_install("requests")
    .add_local_dir(modal_dir, remote_path="/modal")
)


@app.function(
    image=worker_image,
    secrets=[modal.Secret.from_name("convex-modal-secrets")],
    schedule=None,
)
def run_inference_worker() -> dict:
    import sys
    sys.path.insert(0, "/modal")
    from convex_client import get_service_secret, modal_complete, modal_ping, modal_tasks

    secret = get_service_secret()
    ping_result = modal_ping(secret)
    if not ping_result.get("ok"):
        return {"error": "Convex ping failed", "ping": ping_result}

    tasks = modal_tasks(secret)
    if not tasks:
        return {"ok": True, "message": "No tasks", "ping": ping_result}

    results = []
    for task in tasks:
        task_id = task.get("id", "?")
        payload = task.get("payload", {})
        result = {"echo": payload, "processed": True}
        modal_complete(secret, task_id, result)
        results.append({"taskId": task_id, "result": result})
    return {"ok": True, "processed": len(results), "results": results}
