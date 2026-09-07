"""
config.py — loads settings from .env into Python variables.
Every other file imports FROM here instead of reading os.environ
directly, so there's one single place that knows about .env.
"""
import os
from dotenv import load_dotenv

load_dotenv()  # reads the .env file in this folder and loads it into the environment

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # login sessions last 7 days

_cors_raw = os.getenv("CORS_ORIGINS", "")
CORS_ORIGINS = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_KEY must be set in your .env file. "
        "Copy .env.example to .env and fill in your real Supabase project values."
    )