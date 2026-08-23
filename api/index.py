import os
import sys
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
@app.get("/index.html")
async def serve_index():
    index_html = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)
    return {"status": "healthy", "service": "Scraper Health Console"}
