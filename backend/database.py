"""
database.py — creates ONE Supabase client and shares it across the
whole app. Every router imports `supabase` from here instead of
creating its own connection.
"""
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)