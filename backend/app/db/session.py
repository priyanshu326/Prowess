"""
Database session and engine management.
Defaults to local SQLite file database for instant zero-dependency execution.
Seamlessly connects to PostgreSQL/Supabase when DATABASE_URL is configured.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..config import settings
from .models import Base

db_url = settings.DATABASE_URL

# SQLite requires check_same_thread=False for multi-threaded FastAPI workers
if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(db_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all database tables if they do not exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI Dependency for database session injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
