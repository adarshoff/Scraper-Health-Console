import os
import sys
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Add root directory to python path
root_dir = os.path.dirname(os.path.dirname(__file__))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.main import app

dist_dir = os.path.join(root_dir, "frontend", "dist")
assets_dir = os.path.join(dist_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/")
async def serve_root():
    index_html = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)
    return {"message": "Scraper Health Console API Running"}

@app.get("/{full_path:path}")
async def serve_fallback(full_path: str):
    if full_path.startswith("api"):
        return {"detail": "Not Found"}
    index_html = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)
    return {"detail": "Not Found"}
