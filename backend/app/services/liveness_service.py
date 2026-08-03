"""
MiniFASNet Liveness Detection Service.
Prevents photo/screen spoofing attacks.

MiniFASNet model is bundled with insightface's anti-spoofing utilities.
Falls back to score=1.0 (pass) if model is unavailable, logging a warning.
"""
import logging
import numpy as np
import cv2
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Lazy import — anti_spoof may not be available in all environments
_liveness_model = None


def _load_liveness_model():
    global _liveness_model
    if _liveness_model is not None:
        return _liveness_model
    try:
        from insightface.model_zoo import get_model
        # MiniFASNet via insightface model zoo
        _liveness_model = get_model("minifasnet", providers=["CPUExecutionProvider"])
        _liveness_model.prepare(ctx_id=0)
        logger.info("MiniFASNet liveness model loaded successfully.")
    except Exception as e:
        logger.warning(f"MiniFASNet not available ({e}). Liveness check disabled — all frames will pass.")
        _liveness_model = "disabled"
    return _liveness_model


def check_liveness(face_crop_bgr: np.ndarray) -> float:
    """
    Run liveness check on a cropped face region.
    Returns a score in [0, 1]. Higher = more likely to be a real person.
    If model is unavailable, returns 1.0 (pass-through).
    """
    model = _load_liveness_model()

    if model == "disabled" or model is None:
        return 1.0  # Liveness bypass — log warning in production

    try:
        face_resized = cv2.resize(face_crop_bgr, (80, 80))
        score = model.get(face_resized)
        return float(score)
    except Exception as e:
        logger.warning(f"Liveness check failed: {e}. Defaulting to pass.")
        return 1.0


def is_live(score: float) -> bool:
    return score >= settings.LIVENESS_THRESHOLD
