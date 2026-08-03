"use client";

import { useRef, useState, useCallback } from "react";

interface CameraState {
  isActive: boolean;
  hasPermission: boolean | null;
  error: string | null;
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>({
    isActive: false,
    hasPermission: null,
    error: null,
  });

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState({ isActive: true, hasPermission: true, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Camera access denied";
      setState({ isActive: false, hasPermission: false, error: message });
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState((prev) => ({ ...prev, isActive: false }));
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
  }, []);

  return { videoRef, state, startCamera, stopCamera, captureFrame };
}
