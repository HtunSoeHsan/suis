import json
import os
import re
from datetime import datetime
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.student import Student

CONFIG_FILE = Path(__file__).parent.parent / "id_config.json"

DEFAULT_CONFIG = {
    "student_id_template": "STU-{YEAR}-{DEPT}-{SEQ:04d}",
    "prefix": "STU",
    "seq_padding": 4,
    "roll_prefix": "R",
    "roll_padding": 3,
    "teacher_prefix": "TCH",
    "teacher_padding": 3,
}


def load_id_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {**DEFAULT_CONFIG, **data}
        except Exception:
            pass
    return dict(DEFAULT_CONFIG)


def save_id_config(config: dict) -> dict:
    updated = {**load_id_config(), **config}
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(updated, f, indent=2)
    return updated


def preview_student_id(template: str, prefix: str = "STU", dept_code: str = "CST", seq: int = 1) -> str:
    """Preview rendered Student ID string for a given template."""
    current_year = datetime.now().strftime("%Y")
    dept = (dept_code or "GEN").upper()

    def replace_seq(match):
        fmt = match.group(1) or "d"
        try:
            return f"{seq:{fmt}}"
        except Exception:
            return str(seq).zfill(4)

    rendered = template.replace("{PREFIX}", prefix).replace("{YEAR}", current_year).replace("{DEPT}", dept)
    rendered = re.sub(r"\{SEQ:?([^}]*)\}", replace_seq, rendered)
    return rendered


def preview_roll_number(prefix: str = "R", padding: int = 3, seq: int = 1) -> str:
    """Preview rendered Roll Number: prefix + zero-padded sequence."""
    return f"{prefix}{str(seq).zfill(padding)}"


def preview_teacher_id(prefix: str = "TCH", padding: int = 3, dept_code: str = "CST", seq: int = 1) -> str:
    """Preview rendered Teacher ID: prefix-YEAR-DEPT-zero-padded sequence."""
    current_year = datetime.now().strftime("%Y")
    dept = (dept_code or "GEN").upper()
    return f"{prefix}-{current_year}-{dept}-{str(seq).zfill(padding)}"


async def generate_student_id(
    db: AsyncSession,
    dept_code: str | None = None,
    custom_template: str | None = None
) -> str:
    config = load_id_config()
    template = custom_template or config.get("student_id_template", DEFAULT_CONFIG["student_id_template"])
    prefix = config.get("prefix", "STU")

    current_year = datetime.now().strftime("%Y")
    dept = (dept_code or "GEN").upper()

    base_prefix = template.split("{SEQ")[0]
    base_prefix_rendered = base_prefix.replace("{PREFIX}", prefix).replace("{YEAR}", current_year).replace("{DEPT}", dept)

    query = select(Student.student_id).where(
        Student.student_id.like(f"{base_prefix_rendered}%")
    )
    result = await db.execute(query)
    existing_ids = result.scalars().all()

    max_seq = 0
    seq_regex = re.compile(rf"^{re.escape(base_prefix_rendered)}(\d+)")

    for sid in existing_ids:
        match = seq_regex.search(sid)
        if match:
            try:
                seq_val = int(match.group(1))
                if seq_val > max_seq:
                    max_seq = seq_val
            except ValueError:
                pass

    next_seq = max_seq + 1
    return preview_student_id(template, prefix=prefix, dept_code=dept, seq=next_seq)


async def generate_roll_number(
    db: AsyncSession,
    dept_code: str | None = None,
    academic_year: int | None = None,
) -> str:
    config = load_id_config()
    prefix = config.get("roll_prefix", DEFAULT_CONFIG["roll_prefix"])
    padding = config.get("roll_padding", DEFAULT_CONFIG["roll_padding"])

    query = select(Student.roll_number).where(
        Student.roll_number.like(f"{prefix}%")
    )
    result = await db.execute(query)
    existing_rolls = result.scalars().all()

    max_seq = 0
    seq_regex = re.compile(rf"^{re.escape(prefix)}(\d+)$")

    for roll in existing_rolls:
        if not roll:
            continue
        match = seq_regex.fullmatch(roll.strip()) or seq_regex.search(roll.strip())
        if match:
            try:
                seq_val = int(match.group(1))
                if seq_val > max_seq:
                    max_seq = seq_val
            except ValueError:
                pass

    next_seq = max_seq + 1
    return preview_roll_number(prefix=prefix, padding=padding, seq=next_seq)


from app.models.teacher import Teacher

async def generate_teacher_id(
    db: AsyncSession,
    dept_code: str | None = None,
) -> str:
    config = load_id_config()
    prefix_base = config.get("teacher_prefix", DEFAULT_CONFIG["teacher_prefix"])
    padding = config.get("teacher_padding", DEFAULT_CONFIG["teacher_padding"])

    current_year = datetime.now().strftime("%Y")
    dept = (dept_code or "GEN").upper()
    prefix = f"{prefix_base}-{current_year}-{dept}-"

    query = select(Teacher.teacher_id).where(
        Teacher.teacher_id.like(f"{prefix}%")
    )
    result = await db.execute(query)
    existing_ids = result.scalars().all()

    max_seq = 0
    seq_regex = re.compile(rf"^{re.escape(prefix)}(\d+)$")

    for tid in existing_ids:
        match = seq_regex.search(tid)
        if match:
            try:
                seq_val = int(match.group(1))
                if seq_val > max_seq:
                    max_seq = seq_val
            except ValueError:
                pass

    next_seq = max_seq + 1
    return preview_teacher_id(prefix=prefix_base, padding=padding, dept_code=dept, seq=next_seq)
