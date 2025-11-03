# src/core/session.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Build DATABASE_URL from environment variables
DB_USER = os.getenv("APP_DB_USER", "linguauser")
DB_PASS = os.getenv("APP_DB_PASS", "linguapass")
DB_HOST = os.getenv("APP_DB_HOST", "app-database")
DB_NAME = os.getenv("APP_DB_NAME", "linguaviet_db")
DB_PORT = os.getenv("APP_DB_PORT", "5432")

DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
