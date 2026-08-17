from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.enums import UserRole
from app.schemas.user import UserCreate, UserUpdate, PasswordReset, UserDetailOut
from app.core.auth import get_current_user, hash_password

router = APIRouter(prefix="/api/users", tags=["User Management"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that enforces ADMIN-only access."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin role required.",
        )
    return current_user


async def _attach_linked_ids(user: User, db: AsyncSession) -> UserDetailOut:
    """Fetch linked student_id / teacher_id (+ full_name) and build UserDetailOut."""
    student_id = None
    teacher_id = None
    linked_name = None

    if user.role == UserRole.STUDENT:
        res = await db.execute(
            select(Student.student_id, Student.full_name).where(Student.user_id == user.user_id)
        )
        row = res.one_or_none()
        if row:
            student_id, linked_name = row
    elif user.role == UserRole.TEACHER:
        res = await db.execute(
            select(Teacher.teacher_id, Teacher.full_name).where(Teacher.user_id == user.user_id)
        )
        row = res.one_or_none()
        if row:
            teacher_id, linked_name = row

    return UserDetailOut(
        user_id=user.user_id,
        username=user.username,
        email=user.email,
        role=user.role,
        student_id=student_id,
        teacher_id=teacher_id,
        linked_name=linked_name,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("", response_model=dict)
async def list_users(
    search: Optional[str] = Query(None, description="Search by username or email"),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all users with optional search and role filter. Admin only."""
    query = select(User)

    filters = []
    if search:
        filters.append(
            or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
            )
        )
    if role:
        filters.append(User.role == role)

    if filters:
        from sqlalchemy import and_
        query = query.where(and_(*filters))

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginated results
    query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    items = []
    for u in users:
        items.append(await _attach_linked_ids(u, db))

    return {"total": total, "items": [item.model_dump() for item in items]}


@router.get("/{user_id}", response_model=UserDetailOut)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Get a single user by user_id. Admin only."""
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return await _attach_linked_ids(user, db)


@router.post("", response_model=UserDetailOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Create a new user account, optionally linking to a student or teacher. Admin only."""
    # Validate link_student_id / link_teacher_id role consistency
    if body.link_student_id and body.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="link_student_id can only be used when role is STUDENT.",
        )
    if body.link_teacher_id and body.role != UserRole.TEACHER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="link_teacher_id can only be used when role is TEACHER.",
        )

    # Check uniqueness
    dup_check = await db.execute(
        select(User).where(or_(User.username == body.username, User.email == body.email))
    )
    if dup_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already in use.",
        )

    # Validate and pre-fetch the profile to link
    student_to_link: Optional[Student] = None
    teacher_to_link: Optional[Teacher] = None

    if body.link_student_id:
        st_res = await db.execute(select(Student).where(Student.student_id == body.link_student_id))
        student_to_link = st_res.scalar_one_or_none()
        if not student_to_link:
            raise HTTPException(status_code=404, detail=f"Student '{body.link_student_id}' not found.")
        if student_to_link.user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Student '{body.link_student_id}' is already linked to another user.",
            )

    if body.link_teacher_id:
        tc_res = await db.execute(select(Teacher).where(Teacher.teacher_id == body.link_teacher_id))
        teacher_to_link = tc_res.scalar_one_or_none()
        if not teacher_to_link:
            raise HTTPException(status_code=404, detail=f"Teacher '{body.link_teacher_id}' not found.")
        if teacher_to_link.user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Teacher '{body.link_teacher_id}' is already linked to another user.",
            )

    # Create user
    new_user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(new_user)
    await db.flush()  # get user_id assigned

    # Link to student/teacher if requested
    if student_to_link:
        student_to_link.user_id = new_user.user_id
    if teacher_to_link:
        teacher_to_link.user_id = new_user.user_id

    await db.flush()
    await db.refresh(new_user)
    return await _attach_linked_ids(new_user, db)


@router.patch("/{user_id}", response_model=UserDetailOut)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Update username, email, or role. Admin only."""
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if body.username is not None:
        dup = await db.execute(
            select(User).where(User.username == body.username, User.user_id != user_id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken.")
        user.username = body.username

    if body.email is not None:
        dup = await db.execute(
            select(User).where(User.email == body.email, User.user_id != user_id)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use.")
        user.email = body.email

    if body.role is not None:
        user.role = body.role

    await db.flush()
    await db.refresh(user)
    return await _attach_linked_ids(user, db)


@router.post("/{user_id}/reset-password", response_model=dict)
async def reset_password(
    user_id: str,
    body: PasswordReset,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Reset a user's password. Admin only."""
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.password_hash = hash_password(body.new_password)
    await db.flush()
    return {"message": f"Password reset successfully for user '{user.username}'."}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Delete a user account. Admin only. Cannot delete yourself."""
    if user_id == current_admin.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account.",
        )

    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    await db.delete(user)
    await db.flush()
