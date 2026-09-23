"""CLI entry: uvicorn src.api:app"""
import uvicorn
from .config import settings

if __name__ == "__main__":
    uvicorn.run("src.api:app", host="0.0.0.0", port=settings.port, reload=False)
