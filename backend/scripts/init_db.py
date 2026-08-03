import asyncio
import sys
from pathlib import Path
import asyncpg

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import get_settings

settings = get_settings()

def get_asyncpg_dsn(url: str) -> str:
    # Convert postgresql+asyncpg:// to postgresql://
    return url.replace("postgresql+asyncpg://", "postgresql://")

async def initialize_database(reset: bool = True):
    dsn = get_asyncpg_dsn(settings.DATABASE_URL)
    print(f"Connecting to database via asyncpg: {dsn.split('@')[-1]}")

    sql_file = backend_dir / "scripts" / "init_db.sql"
    if not sql_file.exists():
        print(f"Error: {sql_file} not found!")
        return

    sql_script = sql_file.read_text()

    conn = await asyncpg.connect(dsn)
    try:
        if reset:
            print("Resetting public schema to apply clean upgraded database structure...")
            await conn.execute("""
                DROP SCHEMA public CASCADE;
                CREATE SCHEMA public;
                GRANT ALL ON SCHEMA public TO public;
            """)
            print("Public schema reset successfully.")

        print("Executing init_db.sql script...")
        await conn.execute(sql_script)
        print("✅ Database schema created and seed data inserted successfully!")
    finally:
        await conn.close()

if __name__ == "__main__":
    reset_db = True
    asyncio.run(initialize_database(reset=reset_db))
