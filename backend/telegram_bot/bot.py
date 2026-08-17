"""
SUIS Telegram Bot — main entry point.

Modes (controlled by BOT_MODE in .env):
  polling  — long polling, no internet-facing server needed (local dev)
  webhook  — Telegram pushes updates to HTTPS endpoint (VPS production)
"""
import logging
import sys

from telegram import BotCommand
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    filters,
)

from app.config import get_settings
from telegram_bot.handlers import (
    handle_help,
    handle_me,
    handle_message,
    handle_start,
    handle_unknown,
)

settings = get_settings()

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


async def _post_init(application) -> None:
    """Set bot command menu shown in Telegram UI."""
    await application.bot.set_my_commands([
        BotCommand("start", "Welcome message"),
        BotCommand("help", "Show available commands"),
        BotCommand("me", "Show your Telegram info & access status"),
    ])
    logger.info("✅ Bot commands registered.")


def build_app():
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.error("❌ TELEGRAM_BOT_TOKEN is not set in .env")
        sys.exit(1)

    app = (
        ApplicationBuilder()
        .token(settings.TELEGRAM_BOT_TOKEN)
        .post_init(_post_init)
        .build()
    )

    # ── Register handlers ────────────────────────────────────────────────────
    app.add_handler(CommandHandler("start", handle_start))
    app.add_handler(CommandHandler("help", handle_help))
    app.add_handler(CommandHandler("me", handle_me))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(MessageHandler(filters.COMMAND, handle_unknown))

    return app


def run_bot() -> None:
    app = build_app()
    mode = settings.BOT_MODE.lower()

    if mode == "polling":
        logger.info("🤖 Starting SUIS Bot in POLLING mode...")
        logger.info("   Allowed usernames: %s", settings.allowed_usernames_set)
        app.run_polling(
            allowed_updates=["message"],
            drop_pending_updates=True,   # ignore messages sent while bot was offline
        )

    elif mode == "webhook":
        if not settings.WEBHOOK_BASE_URL:
            logger.error("❌ WEBHOOK_BASE_URL is not set in .env (required for webhook mode)")
            sys.exit(1)

        webhook_url = f"{settings.WEBHOOK_BASE_URL.rstrip('/')}/webhook/telegram"
        logger.info("🌐 Starting SUIS Bot in WEBHOOK mode...")
        logger.info("   Webhook URL: %s", webhook_url)
        logger.info("   Allowed usernames: %s", settings.allowed_usernames_set)

        app.run_webhook(
            listen="0.0.0.0",
            port=8443,
            webhook_url=webhook_url,
            secret_token=settings.WEBHOOK_SECRET_TOKEN or None,
            drop_pending_updates=True,
        )

    else:
        logger.error("❌ Unknown BOT_MODE=%r — must be 'polling' or 'webhook'", mode)
        sys.exit(1)
