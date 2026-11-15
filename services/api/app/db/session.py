import json
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from services.api.app.core.config import settings

def custom_json_serializer(obj):
    if isinstance(obj, (Decimal, datetime, date)):
        return str(obj)
    return str(obj)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    json_serializer=lambda obj: json.dumps(obj, default=custom_json_serializer),
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
