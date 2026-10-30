"use client";
import { useSyncExternalStore } from "react";
import { getMusicState, subscribeMusic, type MusicState } from "@/lib/music";

const SERVER: MusicState = { playing: false, track: "soft-piano", volume: 0.5, energized: false };

export function useMusic(): MusicState {
  return useSyncExternalStore(subscribeMusic, getMusicState, () => SERVER);
}
