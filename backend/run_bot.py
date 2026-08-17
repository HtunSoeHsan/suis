#!/usr/bin/env python3
"""
SUIS Telegram Bot — standalone entry point.

Usage (from backend/ directory):
    python run_bot.py

Mode is controlled by BOT_MODE in .env:
    BOT_MODE=polling   # local development
    BOT_MODE=webhook   # VPS production
"""
import sys
import os

# Ensure backend/ is on the Python path so `app.*` and `telegram_bot.*` resolve
sys.path.insert(0, os.path.dirname(__file__))

from telegram_bot.bot import run_bot

if __name__ == "__main__":
    run_bot()
