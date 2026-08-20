"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "https://auxilia-web.trap.show").replace(/\/+$/, "");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
type Guest = { id:string; name:string; token?:string; selection:string[]; matchId?:string; queued:boolean };
type Attack = { name:string; cost:number; power:number; range:number; target:string };
type Definition = { id:string; name:string; image:string; maxHP:number; moveCost:number; moveRange:number; attacks:Attack[] };
type Position = { x:number; y:number };
type Fighter = { id:string; definitionId:string; ownerId:string; name:string; hp:number; maxHP:number; position:Position; effects:string[] };
type Player = { id:string; name:string; cost:number };
type Match = { matchId:string; revision:number; players:[Player,Player]; characters:Fighter[]; turnPlayerId:string; turn:number; turnDeadline:string; winnerId?:string; finished:boolean; lastEvent:{type:string;text:string}; events:{type:string;text:string}[] };

async function request<T>(path:string, options:RequestInit={}, token=""):Promise<T> {
  const response = await fetch(`${API}${path}`, { ...options, headers:{ "Content-Type":"application/json", ...(token?{Authorization:`Bearer ${token}`}:{}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "通信に失敗しました");
  return body;
}

export default function Home() {
  const [token,setToken]=useState(""); const [guest,setGuest]=useState<Guest|null>(null); const [definitions,setDefinitions]=useState<Definition[]>([]); const [match,setMatch]=useState<Match|null>(null);
  const [name,setName]=useState(""); const [selected,setSelected]=useState<string[]>([]); const [editingSlot,setEditingSlot]=useState<number|null>(null); const [actor,setActor]=useState(""); const [mode,setMode]=useState<"move"|"attack">("move"); const [attackIndex,setAttackIndex]=useState(0); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [now,setNow]=useState(()=>Date.now());
  const loadMe=useCallback(async(t:string)=>{const me=await request<Guest>("/api/me",{},t);setGuest(me);setSelected(me.selection);return me},[]);
  const loadMatch=useCallback(async(id:string,t=token)=>{const state=await request<Match>(`/api/matches/${id}`,{},t);setMatch(state);return state},[token]);
  useEffect(()=>{async function bootstrap(){request<Definition[]>("/api/characters").then(setDefinitions).catch(e=>setError(e.message));const saved=localStorage.getItem("auxilia-token");if(!saved)return;try{const me=await loadMe(saved);setToken(saved);if(me.matchId)await loadMatch(me.matchId,saved)}catch{localStorage.removeItem("auxilia-token")}}void bootstrap()},[loadMe,loadMatch]);
  useEffect(()=>{if(!token||!guest?.queued)return;const timer=setInterval(()=>loadMe(token).catch(e=>setError(e.message)),1000);return()=>clearInterval(timer)},[guest?.queued,loadMe,token]);
  const matchID=match?.matchId; const matchFinished=match?.finished;
  useEffect(()=>{if(!token||!matchID||matchFinished)return;const timer=setInterval(()=>loadMatch(matchID).catch(()=>{}),900);return()=>clearInterval(timer)},[loadMatch,matchID,matchFinished,token]);
  useEffect(()=>{if(!match)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[match]);

  const me=match?.players.find(p=>p.id===guest?.id); const opponent=match?.players.find(p=>p.id!==guest?.id); const myTurn=match?.turnPlayerId===guest?.id;
  const active=useMemo(()=>match?.characters.find(c=>c.id===actor),[actor,match]); const activeDefinition=definitions.find(d=>d.id===active?.definitionId);
  const remaining=match?Math.max(0,Math.ceil((new Date(match.turnDeadline).getTime()-now)/1000)):90;
  const imageFor=(id:string)=>{const d=definitions.find(item=>item.id===id);return d?`${BASE}/characters/${d.image}`:""};

  async function join(event:FormEvent){event.preventDefault();setBusy(true);setError("");try{const joined=await request<Guest>("/api/guests",{method:"POST",body:JSON.stringify({name})});setToken(joined.token!);localStorage.setItem("auxilia-token",joined.token!);setGuest(joined);setSelected([])}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  function chooseCharacter(id:string){if(editingSlot===null||selected.includes(id))return;const next=[...selected];next[editingSlot]=id;setSelected(next);setEditingSlot(null)}
  function clearSlot(index:number){if(guest?.queued)return;setSelected(current=>{const next=[...current];next[index]="";return next});setEditingSlot(null)}
  async function saveSelection(){const next=await request<Guest>("/api/me/selection",{method:"PUT",body:JSON.stringify({characterIds:selected})},token);setGuest(next)}
  async function queue(){setBusy(true);setError("");try{await saveSelection();setGuest(await request<Guest>("/api/matchmaking",{method:"POST",body:"{}"},token))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function cancel(){setGuest(await request<Guest>("/api/matchmaking",{method:"DELETE"},token))}
  async function acceptMatch(){if(!guest?.matchId)return;setBusy(true);setError("");try{await loadMatch(guest.matchId)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function act(position:Position){if(!match||!actor||!myTurn)return;setBusy(true);setError("");try{const path=mode==="move"?"move":"attack";setMatch(await request<Match>(`/api/matches/${match.matchId}/${path}`,{method:"POST",body:JSON.stringify({commandId:crypto.randomUUID(),expectedRevision:match.revision,characterId:actor,attackIndex,target:position})},token));setActor("")}catch(e){setError((e as Error).message);await loadMatch(match.matchId)}finally{setBusy(false)}}
  async function endTurn(){if(!match)return;setBusy(true);try{setMatch(await request<Match>(`/api/matches/${match.matchId}/end-turn`,{method:"POST",body:JSON.stringify({commandId:crypto.randomUUID(),expectedRevision:match.revision,characterId:"",attackIndex:0,target:{x:0,y:0}})},token));setActor("")}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  function reset(){localStorage.removeItem("auxilia-token");location.reload()}

  if(match?.finished){const winner=match.players.find(p=>p.id===match.winnerId);return <Frame step="RESULT"><section className="result"><p className="eyebrow">MATCH COMPLETE</p><div className="result-mark">{winner?.id===guest?.id?"WIN":"LOSE"}</div><h1>{winner?.name} の勝利</h1><p>{match.turn}ターン・最終リビジョン {match.revision}</p><button className="primary" onClick={reset}>エントランスへ戻る</button></section></Frame>}

  if(match&&guest) return <Frame step={`MATCH ${match.matchId.slice(-6).toUpperCase()}`}>
    <section className="battle-head"><div><span>TURN {match.turn} · {remaining}s</span><h2>{myTurn?"あなたのターン":"相手のターン"}</h2></div><div className="score"><b>{me?.name}</b><span>COST {me?.cost}/50</span><i>VS</i><b>{opponent?.name}</b><span>COST {opponent?.cost}/50</span></div><button disabled={!myTurn||busy} onClick={endTurn}>ターン終了</button></section>
    <section className="battle-layout"><div className="board">{Array.from({length:40},(_,i)=>{const p={x:i%8,y:Math.floor(i/8)};const fighter=match.characters.find(c=>c.hp>0&&c.position.x===p.x&&c.position.y===p.y);const mine=fighter?.ownerId===guest.id;return <button key={i} aria-label={`グリッド ${p.x},${p.y}`} className={`${fighter?"occupied":""} ${mine?"mine":"enemy"} ${actor===fighter?.id?"active":""}`} onClick={()=>fighter&&mine?setActor(fighter.id):act(p)}><small>{p.x},{p.y}</small>{fighter&&<><img src={imageFor(fighter.definitionId)} alt={fighter.name}/><em>{fighter.hp}/{fighter.maxHP}</em></>}</button>})}</div>
      <aside className="battle-panel"><p className="eyebrow">ACTION CONTROL</p><h3>{active?.name??"キャラクターを選択"}</h3><div className="mode"><button className={mode==="move"?"on":""} onClick={()=>setMode("move")}>移動</button><button className={mode==="attack"?"on":""} onClick={()=>setMode("attack")}>攻撃</button></div>{mode==="attack"&&activeDefinition&&<div className="attack-list">{activeDefinition.attacks.map((a,i)=><button key={a.name} className={attackIndex===i?"on":""} onClick={()=>setAttackIndex(i)}><b>{a.name}</b><span>威力 {a.power} · コスト {a.cost}</span></button>)}</div>}<p>{active?`${mode==="move"?"移動先":"対象"}のマスを選択してください。最終判定はサーバーで行われます。`:"自分のキャラクターを選択してください。"}</p><div className="event"><span>BATTLE LOG</span>{[...match.events].reverse().slice(0,6).map((e,i)=><p key={`${e.type}-${i}`}>{e.text}</p>)}</div>{error&&<p className="error">{error}</p>}</aside>
    </section>
  </Frame>;

  if(guest) return <Frame step="ENTRANCE">
    <section className="entrance-head"><div><p className="eyebrow">WELCOME, {guest.name.toUpperCase()}</p><h1>3人の部隊を編成。</h1></div><div className={`status ${guest.queued?"searching":""}`}>{guest.matchId?"マッチングしました":guest.queued?"対戦相手を検索中":"3人を選択"}</div></section>
    <section className="party-slots">{Array.from({length:3},(_,index)=>{const id=selected[index];const d=definitions.find(item=>item.id===id);return <button key={index} className={`party-slot ${d?"filled":""}`} disabled={guest.queued||!!guest.matchId} onClick={()=>setEditingSlot(index)}>{d?<><span>SLOT 0{index+1}</span><img src={`${BASE}/characters/${d.image}`} alt={d.name}/><div><h2>{d.name}</h2><p>HP {d.maxHP} · MOVE COST {d.moveCost}</p></div></>:<><b>＋</b><span>SLOT 0{index+1}</span><p>クリックして選択</p></>}</button>})}</section>
    <section className="match-bar"><div><b>{selected.filter(Boolean).length}/3 SELECTED</b><span>{guest.matchId?"了承するとゲームを読み込みます":guest.queued?"マッチ成立までお待ちください":"各枠をクリックしてキャラクターを選択してください"}</span></div>{guest.matchId?<button className="primary" onClick={acceptMatch} disabled={busy}>対戦を開始</button>:guest.queued?<button className="secondary" onClick={cancel}>キャンセル</button>:<button className="primary" disabled={selected.filter(Boolean).length!==3||busy} onClick={queue}>マッチング開始</button>}</section>
    {editingSlot!==null&&<div className="modal-backdrop"><div className="character-modal" role="dialog" aria-modal="true" aria-labelledby="character-modal-title"><header><div><p className="eyebrow">SELECT FOR SLOT 0{editingSlot+1}</p><h2 id="character-modal-title">キャラクター選択</h2></div><button aria-label="閉じる" onClick={()=>setEditingSlot(null)}>×</button></header><div className="roster">{definitions.map(d=><button key={d.id} disabled={selected.includes(d.id)} onClick={()=>chooseCharacter(d.id)}><img src={`${BASE}/characters/${d.image}`} alt={d.name}/><h3>{d.name}</h3><p>HP {d.maxHP} / 移動C {d.moveCost}</p><div>{d.attacks.map(a=><span key={a.name}>{a.name}</span>)}</div></button>)}</div>{selected[editingSlot]&&<button className="remove-character" onClick={()=>clearSlot(editingSlot)}>この枠を空にする</button>}</div></div>}
    {error&&<p className="floating-error">{error}</p>}
  </Frame>;

  return <Frame step="GUEST ENTRY"><section className="welcome"><p className="eyebrow">TACTICAL ONLINE BATTLE</p><h1>戦場に、<br/>名前を刻め。</h1><p className="lead">登録不要。名前を決めたら、すぐに戦術グリッドへ。</p><form onSubmit={join} className="join-card"><label htmlFor="player-name">プレイヤー名</label><div className="join-row"><input id="player-name" value={name} onChange={e=>setName(e.target.value)} maxLength={20} placeholder="名前を入力" autoComplete="nickname"/><button disabled={busy}>エントランスへ</button></div><small>1〜20文字・アカウント登録は必要ありません</small></form>{error&&<p className="error">{error}</p>}</section><aside className="grid-preview">{Array.from({length:40},(_,i)=><span key={i} className={i===9||i===26?"unit":i===14?"target":""}/>)}</aside></Frame>;
}

function Frame({step,children}:{step:string;children:React.ReactNode}){return <main className="app"><header className="brand"><b>AUXILIA</b><span>Battle Prototype</span><i>{step}</i></header>{children}<footer>SERVER AUTHORITATIVE · 5 × 8 GRID · 90 SECOND TURN</footer></main>}
