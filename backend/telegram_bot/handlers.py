"""
Telegram Bot message handlers.
All handlers check username allowlist before processing.
"""
import logging
from telegram import Update
from telegram.ext import ContextTypes
from telegram.constants import ParseMode

from app.database import AsyncSessionLocal
from app.services.groq_service import get_groq_service
from telegram_bot.access_control import is_allowed
from telegram_bot.formatter import (
    format_answer,
    format_denied,
    format_help,
    format_welcome,
)

logger = logging.getLogger(__name__)
groq_service = get_groq_service()


# ─── Helper ──────────────────────────────────────────────────────────────────

async def _send_chunks(update: Update, chunks: list[str]) -> None:
    """Send one or more message chunks, using plain text (safe fallback)."""
    for chunk in chunks:
        try:
            await update.message.reply_text(chunk, parse_mode=ParseMode.MARKDOWN_V2)
        except Exception:
            # Fallback to plain text if Markdown parse fails
            await update.message.reply_text(chunk)


# ─── /start ──────────────────────────────────────────────────────────────────

async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    username = update.effective_user.username
    if not is_allowed(username):
        await update.message.reply_text(format_denied(username), parse_mode=ParseMode.MARKDOWN_V2)
        return
    await update.message.reply_text(format_welcome(username), parse_mode=ParseMode.MARKDOWN_V2)


# ─── /help ───────────────────────────────────────────────────────────────────

async def handle_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    username = update.effective_user.username
    if not is_allowed(username):
        await update.message.reply_text(format_denied(username), parse_mode=ParseMode.MARKDOWN_V2)
        return
    await update.message.reply_text(format_help(), parse_mode=ParseMode.MARKDOWN_V2)


# ─── /me ─────────────────────────────────────────────────────────────────────

async def handle_me(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    username = user.username
    text = (
        f"👤 *Your Telegram Info*\n\n"
        f"• Name: {user.full_name}\n"
        f"• Username: @{username or '(none)'}\n"
        f"• User ID: `{user.id}`\n"
        f"• Access: {'✅ Allowed' if is_allowed(username) else '⛔ Denied'}"
    )
    try:
        await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN_V2)
    except Exception:
        await update.message.reply_text(text)


# ─── Free-text / AI Chat ─────────────────────────────────────────────────────

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Main handler — routes free-text messages to GroqChatService.
    Performs access control check first, then queries AI + DB.
    """
    username = update.effective_user.username

    # ── 1. Access check ──────────────────────────────────────────────────────
    if not is_allowed(username):
        logger.warning("Denied access for username=%s (id=%s)", username, update.effective_user.id)
        await update.message.reply_text(format_denied(username), parse_mode=ParseMode.MARKDOWN_V2)
        return

    # ── 2. Show "typing…" indicator ──────────────────────────────────────────
    await update.message.chat.send_action("typing")

    query = update.message.text.strip()
    if not query:
        await update.message.reply_text("Please send a non-empty message.")
        return

    logger.info("Query from @%s: %s", username, query[:80])

    # ── 3. Call existing GroqChatService ─────────────────────────────────────
    try:
        async with AsyncSessionLocal() as db:
            result = await groq_service.chat(query, db)
        answer = result.get("answer", "⚠️ No response from AI service.")
    except Exception as exc:
        logger.exception("GroqChatService error: %s", exc)
        answer = f"⚠️ AI service error: {exc}"

    # ── 4. Send formatted response ───────────────────────────────────────────
    chunks = format_answer(answer)
    await _send_chunks(update, chunks)


# ─── Unknown command ─────────────────────────────────────────────────────────

async def handle_unknown(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "❓ Unknown command. Use /help to see available commands."
    )
