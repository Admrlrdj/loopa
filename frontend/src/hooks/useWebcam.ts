"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type CamState = "idle" | "requesting" | "ready" | "denied" | "unavailable";

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>("idle");

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState("unavailable"); return; }
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState("ready");
    } catch (e) {
      setState((e as DOMException)?.name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
  }, []);

  /** Ambil satu frame JPEG (base64 tanpa prefix). Resolusi dibatasi demi latensi. */
  const grab = useCallback((width = 480, quality = 0.7): string | null => {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) return null;
    const c = (canvasRef.current ??= document.createElement("canvas"));
    c.width = width;
    c.height = Math.round((v.videoHeight / v.videoWidth) * width);
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", quality).split(",")[1] ?? null;
  }, []);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);
  return { videoRef, state, start, stop, grab };
}
