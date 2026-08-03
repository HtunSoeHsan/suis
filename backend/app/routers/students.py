from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut, StudentListOut

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.get("", response_model=StudentListOut)
async def list_students(
    search: str | None = Query(None, description="Search by name, ID, roll number, NRC, or email"),
    dept_code: str | None = None,
    academic_year: int | None = None,
    section: str | None = Query(None, description="Filter by section: A, B, or C"),
    status: str | None = Query(None, description="Filter by status: Active, Graduated, Suspended, Dropped"),
    is_face_registered: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(Student)
    if search and isinstance(search, str):
        query = query.where(
            or_(
                Student.full_name.ilike(f"%{search}%"),
                Student.student_id.ilike(f"%{search}%"),
                Student.roll_number.ilike(f"%{search}%"),
                Student.nrc_number.ilike(f"%{search}%"),
                Student.email.ilike(f"%{search}%"),
            )
        )
    if dept_code and isinstance(dept_code, str):
        query = query.where(Student.dept_code == dept_code)
    if academic_year is not None and isinstance(academic_year, int):
        query = query.where(Student.academic_year == academic_year)
    if section and isinstance(section, str):
        query = query.where(Student.section == section.upper())
    if status and isinstance(status, str):
        query = query.where(Student.status == status)
    if is_face_registered is not None and isinstance(is_face_registered, bool):
        query = query.where(Student.is_face_registered == is_face_registered)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar_one()

    result = await db.execute(query.order_by(Student.academic_year, Student.section, Student.roll_number).offset(skip).limit(limit))
    items = result.scalars().all()

    return StudentListOut(total=total, items=list(items))



from app.services.id_generator import generate_student_id, generate_roll_number

@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
async def create_student(body: StudentCreate, db: AsyncSession = Depends(get_db)):
    if not body.student_id or body.student_id.strip() == "":
        body.student_id = await generate_student_id(db, dept_code=body.dept_code)
    else:
        existing = await db.execute(select(Student).where(Student.student_id == body.student_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Student ID '{body.student_id}' already exists.")

    if not body.roll_number or body.roll_number.strip() == "":
        body.roll_number = await generate_roll_number(db, dept_code=body.dept_code, academic_year=body.academic_year)

    student = Student(**body.model_dump())
    db.add(student)
    await db.flush()
    await db.refresh(student)
    return student


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(student_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.student_id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return student


@router.patch("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: str, body: StudentUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Student).where(Student.student_id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    await db.flush()
    await db.refresh(student)
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(student_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.student_id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    await db.delete(student)
    await db.flush()
