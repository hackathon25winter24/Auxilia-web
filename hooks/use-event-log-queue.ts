"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { GameEvent, Match } from "@/lib/types";

const MINIMUM_DISPLAY_MS = 1000;

export function useEventLogQueue() {
  const [displayedEvent, setDisplayedEvent] = useState<GameEvent>();
  const matchIdRef = useRef("");
  const seenSequenceRef = useRef(0);
  const pendingRef = useRef<GameEvent[]>([]);
  const displayedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const pump = useCallback(function scheduleNextEvent() {
    if (timerRef.current || pendingRef.current.length === 0) return;
    const remaining = Math.max(
      0,
      MINIMUM_DISPLAY_MS - (Date.now() - displayedAtRef.current),
    );
    timerRef.current = setTimeout(() => {
      const next = pendingRef.current.shift();
      timerRef.current = undefined;
      if (next) {
        displayedAtRef.current = Date.now();
        setDisplayedEvent(next);
      }
      scheduleNextEvent();
    }, remaining);
  }, []);

  const ingest = useCallback(
    (match: Match) => {
      const events = match.events.length > 0 ? match.events : [match.lastEvent];
      if (matchIdRef.current !== match.matchId) {
        matchIdRef.current = match.matchId;
        pendingRef.current = [];
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = undefined;
        const latest = events.at(-1) ?? match.lastEvent;
        seenSequenceRef.current = latest.sequence ?? match.revision;
        displayedAtRef.current = Date.now();
        setDisplayedEvent(latest);
        return;
      }

      const unseen = events.filter(
        (event) => (event.sequence ?? 0) > seenSequenceRef.current,
      );
      if (unseen.length === 0) return;
      seenSequenceRef.current = unseen.at(-1)!.sequence ?? match.revision;
      pendingRef.current.push(...unseen);
      pump();
    },
    [pump],
  );

  const reset = useCallback(() => {
    matchIdRef.current = "";
    seenSequenceRef.current = 0;
    pendingRef.current = [];
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = undefined;
    displayedAtRef.current = 0;
    setDisplayedEvent(undefined);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { displayedEvent, ingest, reset };
}
