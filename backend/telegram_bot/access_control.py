"""
Access control — username-based allowlist for the SUIS Telegram Bot.
"""
from app.config import get_settings

settings = get_settings()


def get_allowed_usernames() -> set[str]:
    """Return the set of lowercase allowed Telegram usernames from .env."""
    return settings.allowed_usernames_set


def is_allowed(username: str | None) -> bool:
    """
    Return True if the given Telegram username is in the allowlist.

    Rules:
    - username=None  → always denied (user has no username set on Telegram)
    - Comparison is case-insensitive (normalised to lowercase)
    """
    if not username:
        return False
    return username.strip().lower() in get_allowed_usernames()
