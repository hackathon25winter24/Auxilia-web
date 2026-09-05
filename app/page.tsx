"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BattleScene } from "@/components/scenes/battle-scene";
import { EntranceScene } from "@/components/scenes/entrance-scene";
import { ResultScene } from "@/components/scenes/result-scene";
import { TitleScene } from "@/components/scenes/title-scene";
import { request } from "@/lib/api";
import { BGMManager, SEManager, type SEName } from "@/lib/audio";
import { KEY_DIRECTIONS } from "@/lib/game";
import type { Definition, Guest, Match, Position } from "@/lib/types";
import { useEventLogQueue } from "@/hooks/use-event-log-queue";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function Home() {
  const [token, setToken] = useState("");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [actor, setActor] = useState("");
  const [actorTurn, setActorTurn] = useState(0);
  const [mode, setMode] = useState<"move" | "attack">("move");
  const [attackIndex, setAttackIndex] = useState(0);
  const [attackDirection, setAttackDirection] = useState<Position>({
    x: 1,
    y: 0,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [matchReceivedAt, setMatchReceivedAt] = useState(() => Date.now());
  const [controllerPosition, setControllerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [inspectedFighter, setInspectedFighter] = useState("");
  const [showEffectGuide, setShowEffectGuide] = useState(false);
  const controllerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const soundedRevisionRef = useRef(0);
  const {
    displayedEvent,
    ingest: ingestEvents,
    reset: resetEvents,
  } = useEventLogQueue();
  const loadDefinitions = useCallback(async () => {
    const items = await request<Definition[]>("/api/characters");
    setDefinitions(items);
    return items;
  }, []);
  const loadMe = useCallback(async (t: string) => {
    const me = await request<Guest>("/api/me", {}, t);
    setGuest(me);
    setSelected(me.selection);
    return me;
  }, []);
  const syncMatch = useCallback(
    (state: Match) => {
      const receivedAt = Date.now();
      ingestEvents(state);
      setMatch(state);
      setMatchReceivedAt(receivedAt);
      setNow(receivedAt);
      return state;
    },
    [ingestEvents],
  );
  const loadMatch = useCallback(
    async (id: string, t = token) =>
      syncMatch(await request<Match>(`/api/matches/${id}`, {}, t)),
    [syncMatch, token],
  );
  useEffect(() => {
    async function bootstrap() {
      loadDefinitions().catch((e) => setError(e.message));
      const saved = localStorage.getItem("auxilia-token");
      if (!saved) return;
      try {
        const me = await loadMe(saved);
        setToken(saved);
        if (me.matchId) await loadMatch(me.matchId, saved);
      } catch {
        localStorage.removeItem("auxilia-token");
      }
    }
    void bootstrap();
  }, [loadDefinitions, loadMe, loadMatch]);
  useEffect(() => {
    if (!token || !guest?.queued) return;
    const timer = setInterval(
      () => loadMe(token).catch((e) => setError(e.message)),
      1000,
    );
    return () => clearInterval(timer);
  }, [guest?.queued, loadMe, token]);
  const matchID = match?.matchId;
  const matchFinished = match?.finished;
  useEffect(() => {
    if (!token || !matchID || matchFinished) return;
    const timer = setInterval(() => loadMatch(matchID).catch(() => {}), 900);
    return () => clearInterval(timer);
  }, [loadMatch, matchID, matchFinished, token]);
  useEffect(() => {
    if (!matchID) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [matchID]);
  useEffect(() => {
    const resetControllerPosition = () => setControllerPosition(null);
    window.addEventListener("resize", resetControllerPosition);
    return () => window.removeEventListener("resize", resetControllerPosition);
  }, []);
  useEffect(() => {
    if (match?.finished) {
      BGMManager.stop();
      return;
    }
    BGMManager.play(match?.started ? "battle" : "menu");
  }, [match?.finished, match?.started]);
  useEffect(() => {
    const resumeBGM = () => BGMManager.resume();
    const playButtonSound = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "button",
      );
      if (!button || button.disabled) return;
      if (button.dataset.se === "none") return;
      const requested = button.dataset.se as SEName | undefined;
      SEManager.play(
        requested ??
          (match?.started && !match.finished ? "battleClick" : "menuClick"),
      );
    };
    document.addEventListener("pointerdown", resumeBGM, { once: true });
    document.addEventListener("click", playButtonSound);
    return () => {
      document.removeEventListener("pointerdown", resumeBGM);
      document.removeEventListener("click", playButtonSound);
    };
  }, [match?.finished, match?.started]);
  useEffect(() => {
    if (!match || match.revision <= soundedRevisionRef.current) return;
    soundedRevisionRef.current = match.revision;
    if (match.lastEvent.type === "MATCH_STARTED") {
      SEManager.play("startBattle");
    }
    if (match.lastEvent.type === "ATTACKED") SEManager.play("damage");
    if (match.lastEvent.type === "RECOVERED") SEManager.play("recovery");
    if (match.lastEvent.type === "TURN_END_PROCESSING") {
      SEManager.play("endTurn");
    }
    if (match.lastEvent.type === "TURN_ENDED") SEManager.play("startTurn");
    if (match.finished && match.winnerId === guest?.id)
      SEManager.play("victory");
  }, [guest?.id, match]);
  useEffect(() => {
    if (displayedEvent?.type === "TURN_END_DAMAGE") SEManager.play("damage");
    if (displayedEvent?.type === "TURN_END_RECOVERY") {
      SEManager.play("recovery");
    }
  }, [displayedEvent]);

  const myTurn =
    match?.phase !== "turn_end" && match?.turnPlayerId === guest?.id;
  const active = useMemo(
    () =>
      myTurn && match?.turn === actorTurn
        ? match.characters.find((c) => c.id === actor)
        : undefined,
    [actor, actorTurn, match, myTurn],
  );
  const activeDefinition = definitions.find(
    (d) => d.id === active?.definitionId,
  );
  const selectedAttack =
    mode === "attack" ? activeDefinition?.attacks[attackIndex] : undefined;
  const attackable = new Set<string>();
  if (active && selectedAttack) {
    for (const offset of selectedAttack.pattern ?? []) {
      const rotated = {
        x: offset.x * attackDirection.x - offset.y * attackDirection.y,
        y: offset.x * attackDirection.y + offset.y * attackDirection.x,
      };
      const x = active.position.x + rotated.x;
      const y = active.position.y + rotated.y;
      if (x >= 0 && x < 8 && y >= 0 && y < 5) attackable.add(`${x},${y}`);
    }
  }
  const remaining = match?.started
    ? Math.max(
        0,
        Math.ceil(
          (new Date(match.turnDeadline).getTime() -
            new Date(match.serverTime).getTime() -
            (now - matchReceivedAt)) /
            1000,
        ),
      )
    : 90;
  const miniFor = (id: string) => {
    const d = definitions.find((item) => item.id === id);
    return d ? `${BASE}/characters-mini/${d.image}` : "";
  };
  const portraitFor = (id: string) => {
    const d = definitions.find((item) => item.id === id);
    return d ? `${BASE}/characters/${d.portrait}` : "";
  };

  async function join(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const joined = await request<Guest>("/api/guests", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setToken(joined.token!);
      localStorage.setItem("auxilia-token", joined.token!);
      setGuest(joined);
      setSelected([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function chooseCharacter(id: string) {
    if (editingSlot === null || selected.includes(id)) return;
    const next = [...selected];
    next[editingSlot] = id;
    setSelected(next);
    setEditingSlot(null);
  }
  function clearSlot(index: number) {
    if (guest?.queued) return;
    setSelected((current) => {
      const next = [...current];
      next[index] = "";
      return next;
    });
    setEditingSlot(null);
  }
  async function saveSelection() {
    const next = await request<Guest>(
      "/api/me/selection",
      { method: "PUT", body: JSON.stringify({ characterIds: selected }) },
      token,
    );
    setGuest(next);
  }
  async function queue() {
    setBusy(true);
    setError("");
    try {
      await saveSelection();
      setGuest(
        await request<Guest>(
          "/api/matchmaking",
          { method: "POST", body: "{}" },
          token,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setGuest(
      await request<Guest>("/api/matchmaking", { method: "DELETE" }, token),
    );
  }
  async function returnToTitle() {
    if (!guest || guest.matchId) return;
    setBusy(true);
    setError("");
    try {
      if (guest.queued)
        await request<Guest>("/api/matchmaking", { method: "DELETE" }, token);
      localStorage.removeItem("auxilia-token");
      setToken("");
      setGuest(null);
      setSelected([]);
      setEditingSlot(null);
      setMatch(null);
      resetEvents();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function acceptMatch() {
    if (!guest?.matchId) return;
    setBusy(true);
    setError("");
    try {
      syncMatch(
        await request<Match>(
          `/api/matches/${guest.matchId}/ready`,
          { method: "POST", body: "{}" },
          token,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function cancelMatchStart() {
    if (!guest?.matchId) return;
    setBusy(true);
    setError("");
    try {
      syncMatch(
        await request<Match>(
          `/api/matches/${guest.matchId}/ready`,
          { method: "DELETE" },
          token,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
      await loadMatch(guest.matchId);
    } finally {
      setBusy(false);
    }
  }
  const act = useCallback(
    async (position: Position, actionMode = mode) => {
      if (!match || !actor || !myTurn || busy) return;
      setBusy(true);
      setError("");
      try {
        const updated = await request<Match>(
          `/api/matches/${match.matchId}/${actionMode}`,
          {
            method: "POST",
            body: JSON.stringify({
              commandId: crypto.randomUUID(),
              expectedRevision: match.revision,
              characterId: actor,
              attackIndex,
              target: position,
              direction: attackDirection,
            }),
          },
          token,
        );
        syncMatch(updated);
      } catch (e) {
        setError((e as Error).message);
        await loadMatch(match.matchId);
      } finally {
        setBusy(false);
      }
    },
    [
      actor,
      attackDirection,
      attackIndex,
      busy,
      loadMatch,
      match,
      mode,
      myTurn,
      syncMatch,
      token,
    ],
  );
  const moveBy = useCallback(
    (dx: number, dy: number) => {
      if (!active || mode !== "move") return;
      void act(
        { x: active.position.x + dx, y: active.position.y + dy },
        "move",
      );
    },
    [act, active, mode],
  );
  const inputDirection = useCallback(
    (dx: number, dy: number) => {
      if (!active || !myTurn || busy) return;
      if (mode === "attack") setAttackDirection({ x: dx, y: dy });
      else moveBy(dx, dy);
    },
    [active, busy, mode, moveBy, myTurn],
  );
  useEffect(() => {
    if (!match || match.finished || !active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "e") {
        if (event.repeat || !myTurn || busy) return;
        event.preventDefault();
        setMode((current) => (current === "move" ? "attack" : "move"));
        return;
      }
      const delta = KEY_DIRECTIONS[key];
      if (!delta) return;
      event.preventDefault();
      inputDirection(...delta);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, busy, inputDirection, match, myTurn]);
  async function endTurn() {
    if (!match) return;
    setBusy(true);
    try {
      syncMatch(
        await request<Match>(
          `/api/matches/${match.matchId}/end-turn`,
          {
            method: "POST",
            body: JSON.stringify({
              commandId: crypto.randomUUID(),
              expectedRevision: match.revision,
              characterId: "",
              attackIndex: 0,
              target: { x: 0, y: 0 },
            }),
          },
          token,
        ),
      );
      setActor("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function surrender() {
    if (!match || !window.confirm("投降しますか？ この試合は敗北になります。"))
      return;
    setBusy(true);
    setError("");
    try {
      syncMatch(
        await request<Match>(
          `/api/matches/${match.matchId}/surrender`,
          {
            method: "POST",
            body: JSON.stringify({
              commandId: crypto.randomUUID(),
              expectedRevision: match.revision,
              characterId: "",
              attackIndex: 0,
              target: { x: 0, y: 0 },
            }),
          },
          token,
        ),
      );
      setActor("");
    } catch (e) {
      setError((e as Error).message);
      await loadMatch(match.matchId);
    } finally {
      setBusy(false);
    }
  }
  async function returnToEntrance() {
    if (!match) return;
    setBusy(true);
    setError("");
    try {
      const updated = await request<Guest>(
        `/api/matches/${match.matchId}/leave`,
        { method: "POST", body: "{}" },
        token,
      );
      await loadDefinitions();
      setGuest(updated);
      setSelected(updated.selection);
      setMatch(null);
      resetEvents();
      setActor("");
      setMode("move");
      setAttackIndex(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function selectActor(id: string) {
    if (id && !myTurn) return;
    setActor(id);
    setActorTurn(id ? (match?.turn ?? 0) : 0);
    const fighter = match?.characters.find((item) => item.id === id);
    setAttackDirection({
      x: fighter?.ownerId === match?.players[1].id ? -1 : 1,
      y: 0,
    });
    setControllerPosition(null);
  }
  function beginControllerDrag(event: React.PointerEvent<HTMLElement>) {
    const rect = controllerRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setControllerPosition({ x: rect.left, y: rect.top });
  }
  function dragController(event: React.PointerEvent<HTMLElement>) {
    if (!dragRef.current || !controllerRef.current) return;
    const margin = 8;
    const x = Math.min(
      Math.max(margin, event.clientX - dragRef.current.offsetX),
      window.innerWidth - controllerRef.current.offsetWidth - margin,
    );
    const y = Math.min(
      Math.max(margin, event.clientY - dragRef.current.offsetY),
      window.innerHeight - controllerRef.current.offsetHeight - margin,
    );
    setControllerPosition({ x, y });
  }
  function endControllerDrag() {
    dragRef.current = null;
  }
  const mobileDirectionPad = (
    <div
      className="mobile-direction-pad"
      aria-label={mode === "attack" ? "攻撃方向" : "移動方向"}
    >
      <button
        type="button"
        className="up"
        aria-label="上"
        disabled={busy || !myTurn}
        onClick={() => inputDirection(0, 1)}
      >
        ▲
      </button>
      <button
        type="button"
        className="left"
        aria-label="左"
        disabled={busy || !myTurn}
        onClick={() => inputDirection(-1, 0)}
      >
        ◀
      </button>
      <button
        type="button"
        className="right"
        aria-label="右"
        disabled={busy || !myTurn}
        onClick={() => inputDirection(1, 0)}
      >
        ▶
      </button>
      <button
        type="button"
        className="down"
        aria-label="下"
        disabled={busy || !myTurn}
        onClick={() => inputDirection(0, -1)}
      >
        ▼
      </button>
    </div>
  );

  if (match?.finished) {
    const winner = match.players.find((p) => p.id === match.winnerId);
    return (
      <ResultScene
        winnerName={winner?.name}
        isWinner={winner?.id === guest?.id}
        turn={match.turn}
        revision={match.revision}
        busy={busy}
        error={error}
        onReturn={returnToEntrance}
      />
    );
  }

  if (match?.started && guest) {
    return (
      <BattleScene
        match={match}
        guest={guest}
        definitions={definitions}
        inspectedFighter={inspectedFighter}
        setInspectedFighter={setInspectedFighter}
        showEffectGuide={showEffectGuide}
        setShowEffectGuide={setShowEffectGuide}
        active={active}
        activeDefinition={activeDefinition}
        selectedAttack={selectedAttack}
        attackable={attackable}
        remaining={remaining}
        myTurn={!!myTurn}
        busy={busy}
        error={error}
        displayedEvent={displayedEvent}
        actor={actor}
        mode={mode}
        attackIndex={attackIndex}
        controllerPosition={controllerPosition}
        controllerRef={controllerRef}
        mobileDirectionPad={mobileDirectionPad}
        portraitFor={portraitFor}
        miniFor={miniFor}
        selectActor={selectActor}
        act={act}
        surrender={surrender}
        endTurn={endTurn}
        setMode={setMode}
        setAttackIndex={setAttackIndex}
        beginControllerDrag={beginControllerDrag}
        dragController={dragController}
        endControllerDrag={endControllerDrag}
      />
    );
  }

  if (guest) {
    return (
      <EntranceScene
        guest={guest}
        match={match}
        definitions={definitions}
        selected={selected}
        editingSlot={editingSlot}
        busy={busy}
        error={error}
        setEditingSlot={setEditingSlot}
        chooseCharacter={chooseCharacter}
        clearSlot={clearSlot}
        queue={queue}
        cancel={cancel}
        returnToTitle={returnToTitle}
        acceptMatch={acceptMatch}
        cancelMatchStart={cancelMatchStart}
      />
    );
  }

  return (
    <TitleScene
      name={name}
      busy={busy}
      error={error}
      basePath={BASE}
      onNameChange={setName}
      onJoin={join}
    />
  );
}
