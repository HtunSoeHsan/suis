import asyncio
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.auth import hash_password

INITIAL_USERS = [
    {
        "user_id": "usr-admin-1",
        "username": "admin",
        "email": "admin@suis.edu",
        "password": "admin123",
        "role": UserRole.ADMIN,
    },
    {
        "user_id": "usr-tch-1",
        "username": "prof_smith",
        "email": "smith@suis.edu",
        "password": "teacher123",
        "role": UserRole.TEACHER,
    },
    {
        "user_id": "usr-stu-1",
        "username": "mg_mg",
        "email": "mgmg@suis.edu",
        "password": "student123",
        "role": UserRole.STUDENT,
    },
]

async def seed_users():
    async with AsyncSessionLocal() as session:
        print("🌱 Seeding users into database...")
        for user_data in INITIAL_USERS:
            # Check if user exists by username or email
            res = await session.execute(
                select(User).where(
                    (User.username == user_data["username"]) | (User.email == user_data["email"])
                )
            )
            existing = res.scalar_one_or_none()
            if existing:
                print(f"  - User '{user_data['username']}' already exists. Skipping.")
                continue

            hashed = hash_password(user_data["password"])
            new_user = User(
                user_id=user_data["user_id"],
                username=user_data["username"],
                email=user_data["email"],
                password_hash=hashed,
                role=user_data["role"],
            )
            session.add(new_user)
            print(f"  + Added user '{user_data['username']}' ({user_data['role'].value}) | password: '{user_data['password']}'")

        await session.commit()
        print("✅ User seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_users())
