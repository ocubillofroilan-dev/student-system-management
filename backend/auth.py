"""
auth.py — password hashing and JWT token creation/verification.
Nothing in here talks to the database directly; it's pure security logic,
reused by the /auth routes and by dependencies.py (which checks tokens
on every protected request).
"""
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)

def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": user_id,   # "subject" - who this token belongs to
        "role": role,
        "exp": expire,    # expiration time - jose checks this automatically
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Raises JWTError if the token is invalid, tampered with, or expired."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])