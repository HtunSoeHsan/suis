from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.student import Student
from app.models.teacher import Teacher
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherOut, TeacherListOut
from app.services.id_generator import generate_teacher_id

router = APIRouter(prefix="/api/teachers", tags=["Teachers"])


def _normalize_nrc(nrc: str) -> str:
    """Remove ALL whitespace (leading, trailing, and internal) from NRC."""
    return "".join(nrc.split())


async def _check_nrc_unique(db: AsyncSession, nrc: str, exclude_teacher_id: str | None = None) -> None:
    """Raise 409 if nrc_number already exists in teachers or students table."""
    nrc = _normalize_nrc(nrc)
    # Check within teachers
    q = select(Teacher.teacher_id).where(Teacher.nrc_number == nrc)
    if exclude_teacher_id:
        q = q.where(Teacher.teacher_id != exclude_teacher_id)
    dup_teacher = await db.execute(q)
    if dup_teacher.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"NRC '{nrc}' is already registered to another teacher.",
        )
    # Cross-check with students
    dup_student = await db.execute(select(Student.student_id).where(Student.nrc_number == nrc))
    if dup_student.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"NRC '{nrc}' is already registered to a student.",
        )


@router.get("", response_model=TeacherListOut)
async def list_teachers(
    search: str | None = Query(None, description="Search by name, ID, designation, email, NRC, specialization"),
    dept_code: str | None = None,
    status: str | None = Query(None, description="Filter by status: Active, On Leave, Retired, Resigned"),
    is_face_registered: bool | None = None,
    unlinked: bool = Query(False, description="If true, only return teachers without a linked user account"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(Teacher)
    if search and isinstance(search, str):
        query = query.where(
            or_(
                Teacher.full_name.ilike(f"%{search}%"),
                Teacher.teacher_id.ilike(f"%{search}%"),
                Teacher.designation.ilike(f"%{search}%"),
                Teacher.email.ilike(f"%{search}%"),
                Teacher.nrc_number.ilike(f"%{search}%"),
                Teacher.specialization.ilike(f"%{search}%"),
            )
        )
    if dept_code and isinstance(dept_code, str):
        query = query.where(Teacher.dept_code == dept_code)
    if status and isinstance(status, str):
        query = query.where(Teacher.status == status)
    if is_face_registered is not None and isinstance(is_face_registered, bool):
        query = query.where(Teacher.is_face_registered == is_face_registered)
    if unlinked:
        query = query.where(Teacher.user_id == None)  # noqa: E711

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(Teacher.created_at.desc()).offset(skip).limit(limit))
    items = result.scalars().all()

    return TeacherListOut(total=total, items=list(items))


@router.post("", response_model=TeacherOut, status_code=status.HTTP_201_CREATED)
async def create_teacher(body: TeacherCreate, db: AsyncSession = Depends(get_db)):
    if not body.teacher_id or body.teacher_id.strip() == "":
        body.teacher_id = await generate_teacher_id(db, dept_code=body.dept_code)
    else:
        existing = await db.execute(select(Teacher).where(Teacher.teacher_id == body.teacher_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Teacher ID '{body.teacher_id}' already exists.")

    # NRC: normalize (remove all whitespace) then check uniqueness
    if body.nrc_number and body.nrc_number.strip():
        body.nrc_number = _normalize_nrc(body.nrc_number)
        await _check_nrc_unique(db, body.nrc_number)

    teacher = Teacher(**body.model_dump())
    db.add(teacher)
    await db.flush()
    await db.refresh(teacher)
    return teacher


@router.get("/{teacher_id}", response_model=TeacherOut)
async def get_teacher(teacher_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Teacher).where(Teacher.teacher_id == teacher_id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found.")
    return teacher


@router.patch("/{teacher_id}", response_model=TeacherOut)
async def update_teacher(
    teacher_id: str, body: TeacherUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Teacher).where(Teacher.teacher_id == teacher_id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found.")

    # NRC: normalize (remove all whitespace) then check uniqueness (exclude self)
    if body.nrc_number is not None and body.nrc_number.strip():
        body.nrc_number = _normalize_nrc(body.nrc_number)
        await _check_nrc_unique(db, body.nrc_number, exclude_teacher_id=teacher_id)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(teacher, field, value)
    await db.flush()
    await db.refresh(teacher)
    return teacher


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(teacher_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Teacher).where(Teacher.teacher_id == teacher_id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found.")
    await db.delete(teacher)
    await db.flush()
