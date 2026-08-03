from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.services.id_generator import (
    load_id_config, save_id_config,
    preview_student_id, preview_roll_number, preview_teacher_id
)

router = APIRouter(prefix="/api/settings", tags=["Settings"])


class IDConfigSchema(BaseModel):
    student_id_template: str = Field("STU-{YEAR}-{DEPT}-{SEQ:04d}", examples=["STU-{YEAR}-{DEPT}-{SEQ:04d}"])
    prefix: str = Field("STU", examples=["STU", "STD", "SUIS"])
    seq_padding: int = Field(4, ge=1, le=10, examples=[4])

    roll_prefix: str = Field("R", examples=["R", "CS-", "Roll-"])
    roll_padding: int = Field(3, ge=1, le=10, examples=[3])

    teacher_prefix: str = Field("TCH", examples=["TCH", "PROF", "FAC"])
    teacher_padding: int = Field(3, ge=1, le=10, examples=[3])


class IDConfigOut(IDConfigSchema):
    preview_example: str
    preview_roll_example: str
    preview_teacher_example: str


@router.get("/id-format", response_model=IDConfigOut)
async def get_id_format_config():
    config = load_id_config()
    preview_id = preview_student_id(
        config.get("student_id_template", "STU-{YEAR}-{DEPT}-{SEQ:04d}"),
        prefix=config.get("prefix", "STU"),
        dept_code="CST",
        seq=1
    )
    preview_roll = preview_roll_number(
        prefix=config.get("roll_prefix", "R"),
        padding=config.get("roll_padding", 3),
        seq=1
    )
    preview_teacher = preview_teacher_id(
        prefix=config.get("teacher_prefix", "TCH"),
        padding=config.get("teacher_padding", 3),
        dept_code="CST",
        seq=1
    )
    return IDConfigOut(
        student_id_template=config.get("student_id_template", "STU-{YEAR}-{DEPT}-{SEQ:04d}"),
        prefix=config.get("prefix", "STU"),
        seq_padding=config.get("seq_padding", 4),
        roll_prefix=config.get("roll_prefix", "R"),
        roll_padding=config.get("roll_padding", 3),
        teacher_prefix=config.get("teacher_prefix", "TCH"),
        teacher_padding=config.get("teacher_padding", 3),
        preview_example=preview_id,
        preview_roll_example=preview_roll,
        preview_teacher_example=preview_teacher,
    )


@router.post("/id-format", response_model=IDConfigOut)
async def update_id_format_config(body: IDConfigSchema):
    try:
        preview_id = preview_student_id(
            body.student_id_template,
            prefix=body.prefix,
            dept_code="CST",
            seq=1
        )
        preview_roll = preview_roll_number(
            prefix=body.roll_prefix,
            padding=body.roll_padding,
            seq=1
        )
        preview_teacher = preview_teacher_id(
            prefix=body.teacher_prefix,
            padding=body.teacher_padding,
            dept_code="CST",
            seq=1
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid format: {str(e)}")

    updated = save_id_config(body.model_dump())
    return IDConfigOut(
        **updated,
        preview_example=preview_id,
        preview_roll_example=preview_roll,
        preview_teacher_example=preview_teacher,
    )
