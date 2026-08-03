"""
InsightFace Computer Vision Service.

Pipeline:
  1. Decode base64 image → numpy array
  2. RetinaFace: detect face bounding box + landmarks
  3. ArcFace: extract 512-d embedding + normalize
  4. (Optional) MiniFASNet: liveness detection
  5. pgvector cosine similarity search for identification
"""
import base64
import io
import numpy as np
import cv2
from PIL import Image
import insightface
from insightface.app import FaceAnalysis
from app.config import get_settings

settings = get_settings()

# Lazy-loaded singleton
_face_app: FaceAnalysis | None = None


def get_face_app() -> FaceAnalysis:
    global _face_app
    if _face_app is None:
        _face_app = FaceAnalysis(
            name="buffalo_l",  # RetinaFace + ArcFace (512-d)
            providers=["CPUExecutionProvider"],
        )
        _face_app.prepare(ctx_id=0, det_size=(640, 640))
    return _face_app


def decode_base64_image(image_b64: str) -> np.ndarray:
    """Decode base64 image string to BGR numpy array for OpenCV."""
    # Strip data URI prefix if present
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    img_bytes = base64.b64decode(image_b64)
    img_pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    img_bgr = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
    return img_bgr


def extract_embedding(image_b64: str) -> tuple[np.ndarray | None, dict]:
    """
    Extract ArcFace 512-d embedding from a base64 image.
    Returns (embedding_vector, metadata) or (None, error_dict).
    """
    app = get_face_app()
    img = decode_base64_image(image_b64)

    faces = app.get(img)
    if not faces:
        return None, {"error": "No face detected in the image."}
    if len(faces) > 1:
        return None, {"error": "Multiple faces detected. Please show only one face."}

    face = faces[0]
    embedding = face.normed_embedding  # Already L2-normalized by InsightFace
    det_score = float(face.det_score)

    return embedding, {
        "det_score": det_score,
        "bbox": face.bbox.tolist(),
    }
