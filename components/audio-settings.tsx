"use client";

import { useState, type CSSProperties } from "react";

import { BGMManager, SEManager } from "@/lib/audio";

export function AudioSettings() {
  const [open, setOpen] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.35);
  const [seVolume, setSeVolume] = useState(0.6);

  function openSettings() {
    setBgmVolume(BGMManager.getVolume());
    setSeVolume(SEManager.getVolume());
    setOpen(true);
  }

  function changeBGM(value: number) {
    setBgmVolume(value);
    BGMManager.setVolume(value);
  }

  function changeSE(value: number) {
    setSeVolume(value);
    SEManager.setVolume(value);
  }

  return (
    <>
      <button
        type="button"
        className="settings-button"
        aria-label="音量設定を開く"
        title="音量設定"
        onClick={openSettings}
      >
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/UI/volume.png`}
          alt=""
          width={36}
          height={36}
        />
      </button>
      {open && (
        <div className="modal-backdrop settings-backdrop">
          <section
            className="settings-dialog"
            style={
              {
                "--volume-art": `url("${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/UI/bgmBar.png")`,
              } as CSSProperties
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <header>
              <div>
                <p className="eyebrow">AUDIO SETTINGS</p>
                <h2 id="settings-title">音量設定</h2>
              </div>
              <button aria-label="設定を閉じる" onClick={() => setOpen(false)}>
                ×
              </button>
            </header>
            <label>
              <span>
                BGM <b>{Math.round(bgmVolume * 100)}%</b>
              </span>
              <div
                className="volume-slider"
                style={
                  {
                    "--volume-hidden": `${100 - Math.round(bgmVolume * 100)}%`,
                  } as CSSProperties
                }
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(bgmVolume * 100)}
                  onChange={(event) =>
                    changeBGM(Number(event.target.value) / 100)
                  }
                />
              </div>
            </label>
            <label>
              <span>
                SE <b>{Math.round(seVolume * 100)}%</b>
              </span>
              <div
                className="volume-slider"
                style={
                  {
                    "--volume-hidden": `${100 - Math.round(seVolume * 100)}%`,
                  } as CSSProperties
                }
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(seVolume * 100)}
                  onChange={(event) =>
                    changeSE(Number(event.target.value) / 100)
                  }
                />
              </div>
            </label>
          </section>
        </div>
      )}
    </>
  );
}
