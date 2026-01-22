import os
import asyncio
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import course

# 1. LOAD SECRETS
load_dotenv()

# --- CONFIGURATION IMPORTS ---
# We keep these here if they are needed for app initialization or global settings, 
# but most config should be accessed where needed.


# --- APP INITIALIZATION ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTERS ---
app.include_router(course.router) # We can prefix if we want, e.g. /api

@app.get("/")
def health_check():
    return {"status": "ok", "service": "backend"}

# --- ORCHESTRATOR / LAMBDA HANDLER (Keep this accessible if needed by Lambda runtime) ---
# If Lambda loads this file, it needs access to lambda_handler.
# However, usually Lambda points to a specific file.handler.
# If previous setup pointed to backend.main.lambda_handler, we should keep it or re-export it.
# Or better, user instructions said "Update lambda_handler... Process Render Job".
# The user's request "Robust Orchestration (backend/orchestrator.py)" implied orchestrator.py is the place for this.
# Let's import it here just in case, but really it should be independent.

from backend.orchestrator import lambda_handler

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)