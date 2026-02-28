"""
Modal app for the Synapse (Next.js + Convex) project.

First-time: run this file (no Convex needed).
  python -m modal run app.py

Convex worker (requires secrets): run worker.py
  python -m modal run worker.py
"""

import modal

app = modal.App("synapse-modal")


@app.function()
def square(x: int) -> int:
    """Runs on a remote Modal worker."""
    print("This code is running on a remote worker!")
    return x**2


@app.local_entrypoint()
def main():
    """Run with: python -m modal run app.py"""
    result = square.remote(42)
    print("The square is", result)
