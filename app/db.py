from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DATABASE_URL

# Engine for PostgreSQL (Supabase)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

# Session factory
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

# Declarative base for ORM models
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a DB session and ensures it's closed.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
