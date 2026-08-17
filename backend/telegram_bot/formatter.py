"""
Response formatter — converts GroqService output to Telegram-friendly Markdown.
Handles Telegram's 4096-character message size limit.
"""

MAX_MESSAGE_LENGTH = 4096


def _escape_md(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2."""
    special = r"\_*[]()~`>#+-=|{}.!"
    return "".join(f"\\{c}" if c in special else c for c in text)


def format_answer(answer: str) -> list[str]:
    """
    Split a long answer into Telegram-safe chunks (≤ 4096 chars each).
    Returns a list of message strings ready to send.
    """
    if not answer:
        return ["⚠️ No response received."]

    # Clean up excessive blank lines
    cleaned = "\n".join(
        line for i, line in enumerate(answer.splitlines())
        if not (line.strip() == "" and i > 0 and answer.splitlines()[i - 1].strip() == "")
    )

    if len(cleaned) <= MAX_MESSAGE_LENGTH:
        return [cleaned]

    # Split at paragraph boundaries to keep context intact
    chunks: list[str] = []
    current = ""
    for paragraph in cleaned.split("\n\n"):
        block = paragraph + "\n\n"
        if len(current) + len(block) > MAX_MESSAGE_LENGTH:
            if current:
                chunks.append(current.rstrip())
            current = block
        else:
            current += block

    if current.strip():
        chunks.append(current.rstrip())

    return chunks if chunks else [cleaned[:MAX_MESSAGE_LENGTH]]


def format_denied(username: str | None) -> str:
    name_part = f"@{username}" if username else "(no username set)"
    return (
        "⛔ *Access Denied*\n\n"
        f"Your Telegram username {name_part} is not authorised to use this bot\\.\n\n"
        "Please contact the administrator to request access\\."
    )


def format_welcome(username: str | None) -> str:
    name = f"@{username}" if username else "there"
    return (
        f"👋 *Welcome, {name}\\!*\n\n"
        "I'm the *SUIS School Information Bot*\\. "
        "Ask me anything about students, teachers, courses, timetables, "
        "departments, and more — in Myanmar or English\\.\n\n"
        "📌 *Quick commands:*\n"
        "/help — show all commands\n"
        "/me — show your Telegram info\n\n"
        "💬 *Example questions:*\n"
        "• `CST department မှာ ဘယ်နှစ်ယောက်ရှိလဲ?`\n"
        "• `Show all active teachers`\n"
        "• `Year 2 CST timetable ပြပါ`"
    )


def format_help() -> str:
    return (
        "📚 *SUIS Bot — Available Commands*\n\n"
        "/start — Welcome message\n"
        "/help — This help message\n"
        "/me — Your Telegram user info\n\n"
        "💬 *Free-text queries \\(Myanmar or English\\):*\n"
        "• Students by department or year\n"
        "• Teacher information\n"
        "• Course details and enrollments\n"
        "• Timetables \\(academic & exam\\)\n"
        "• Attendance records\n"
        "• Department information\n\n"
        "⚡ Powered by Groq AI \\+ PostgreSQL"
    )
