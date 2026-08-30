from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.services.id_generator import (
    load_id_config, save_id_config,
    preview_student_id, preview_roll_number, preview_teacher_id
)

router = APIRouter(prefix="/api/settings", tags=["Settings"])


class IDConfigSchema(BaseModel):
    student_id_template: str = Field("{PREFIX}-{SEQ:04d}", examples=["{PREFIX}-{SEQ:04d}"])
    prefix: str = Field("STU-2026", examples=["STU-2026"])
    seq_padding: int = Field(4, ge=1, le=10, examples=[4])

    roll_prefix: str = Field("MUB-", examples=["MUB-"])
    roll_padding: int = Field(4, ge=1, le=10, examples=[4])

    teacher_prefix: str = Field("TCH-2026", examples=["TCH-2026"])
    teacher_padding: int = Field(3, ge=1, le=10, examples=[3])
    teacher_include_dept: bool = Field(False, description="Whether to include department code in teacher ID")


class IDConfigOut(IDConfigSchema):
    preview_example: str
    preview_roll_example: str
    preview_teacher_example: str


@router.get("/id-format", response_model=IDConfigOut)
async def get_id_format_config():
    config = load_id_config()
    preview_id = preview_student_id(
        config.get("student_id_template", "{PREFIX}-{SEQ:04d}"),
        prefix=config.get("prefix", "STU-2026"),
        dept_code=None,
        seq=1
    )
    preview_roll = preview_roll_number(
        prefix=config.get("roll_prefix", "MUB-"),
        padding=config.get("roll_padding", 4),
        seq=1
    )
    preview_teacher = preview_teacher_id(
        prefix=config.get("teacher_prefix", "TCH-2026"),
        padding=config.get("teacher_padding", 3),
        dept_code=None,
        seq=1,
        include_dept=config.get("teacher_include_dept", False)
    )
    return IDConfigOut(
        student_id_template=config.get("student_id_template", "{PREFIX}-{SEQ:04d}"),
        prefix=config.get("prefix", "STU-2026"),
        seq_padding=config.get("seq_padding", 4),
        roll_prefix=config.get("roll_prefix", "MUB-"),
        roll_padding=config.get("roll_padding", 4),
        teacher_prefix=config.get("teacher_prefix", "TCH-2026"),
        teacher_padding=config.get("teacher_padding", 3),
        teacher_include_dept=config.get("teacher_include_dept", False),
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
            dept_code=None,
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
            dept_code=None,
            seq=1,
            include_dept=body.teacher_include_dept
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
