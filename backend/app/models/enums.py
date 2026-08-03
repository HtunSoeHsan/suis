import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"


class SlotType(str, enum.Enum):
    LECTURE = "LECTURE"
    LAB = "LAB"
    LUNCH_BREAK = "LUNCH_BREAK"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    LATE = "LATE"
    ABSENT = "ABSENT"


class EnrollmentType(str, enum.Enum):
    INITIAL = "INITIAL"
    DEFERRED = "DEFERRED"
