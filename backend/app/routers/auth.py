from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.core.auth import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


async def build_user_out(user: User, db: AsyncSession) -> UserOut:
    """Fetch linked student_id or teacher_id for UserOut object."""
    student_id = None
    teacher_id = None

    if user.role.value == "STUDENT":
        st_res = await db.execute(select(Student.student_id).where(Student.user_id == user.user_id))
        student_id = st_res.scalar_one_or_none()
    elif user.role.value == "TEACHER":
        t_res = await db.execute(select(Teacher.teacher_id).where(Teacher.user_id == user.user_id))
        teacher_id = t_res.scalar_one_or_none()

    return UserOut(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        role=user.role,
        student_id=student_id,
        teacher_id=teacher_id,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user via username or email and password.
    Returns JWT access_token and user profile.
    """
    query = select(User).where(
        or_(
            User.username == body.username,
            User.email == body.username,
        )
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_out = await build_user_out(user, db)
    access_token = create_access_token(data={"sub": user.user_id, "role": user.role.value})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_out,
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return profile of currently logged-in user."""
    return await build_user_out(current_user, db)


@router.post("/seed-passwords")
async def seed_passwords(db: AsyncSession = Depends(get_db)):
    """
    Seed/Reset default passwords for demo users:
    - admin -> admin123
    - prof_smith -> teacher123
    - mg_mg -> student123
    - aung_aung -> student123
    """
    default_passwords = {
        "admin": "admin123",
        "prof_smith": "teacher123",
        "mg_mg": "student123",
        "aung_aung": "student123",
    }

    updated = []
    for username, plain_pass in default_passwords.items():
        res = await db.execute(select(User).where(User.username == username))
        user = res.scalar_one_or_none()
        if user:
            user.password_hash = hash_password(plain_pass)
            updated.append(username)

    await db.flush()
    return {"message": "Default passwords seeded successfully", "users_updated": updated}
