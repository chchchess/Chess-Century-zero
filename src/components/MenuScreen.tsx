import React from 'react';
import { TIME_CONTROLS } from '../data/assets';
import type { BotProfile, ColorPreference, GameMode } from '../types/chess';
import { BotAvatarIcon, ChessPieceIcon } from './ChessSvgs';

interface MenuScreenProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  allBots: BotProfile[];
  activeBotId: string;
  onSelectBot: (botId: string) => void;
  engineStatusText: string;
  engineStatusTone: 'ready' | 'warn' | 'error';
  selectedColorPref: ColorPreference;
  onSelectColorPref: (color: ColorPreference) => void;
  timeControl: string;
  onChangeTimeControl: (tc: string) => void;
  onStartGame: () => void;
  onOpenSettings: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({
  selectedMode,
  onSelectMode,
  allBots,
  activeBotId,
  onSelectBot,
  engineStatusText,
  engineStatusTone,
  selectedColorPref,
  onSelectColorPref,
  timeControl,
  onChangeTimeControl,
  onStartGame,
  onOpenSettings,
}) => {
  const activeBot = allBots.find((b) => b.id === activeBotId) || allBots[0];

  const statusColorClass =
    engineStatusTone === 'error'
      ? 'text-[#ff8c88]'
      : engineStatusTone === 'warn'
        ? 'text-[#e8b84b]'
        : 'text-[#81b64c]';

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-[500px] bg-gradient-to-b from-[#232a20] to-[#1b2018] rounded-[22px] p-5 sm:p-6 border border-[#3a4534] shadow-[0_24px_56px_rgba(0,0,0,0.65)] flex flex-col gap-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[#313a2c] pb-3.5 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 shrink-0 rounded-xl overflow-hidden shadow-[0_6px_14px_rgba(0,0,0,0.45)] border border-[#96cc60]/40 relative bg-gradient-to-br from-[#7eb249] to-[#344e21]"
              aria-hidden="true"
            >
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-30 pointer-events-none">
                <div className="bg-[#eeeed2]" />
                <div className="bg-[#2c441c]" />
                <div className="bg-[#2c441c]" />
                <div className="bg-[#eeeed2]" />
              </div>
              <ChessPieceIcon
                pieceKey="wk"
                className="w-[33px] h-[33px] absolute left-[1px] top-[3px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
              />
              <ChessPieceIcon
                pieceKey="bn"
                className="w-[33px] h-[33px] absolute right-[1px] bottom-[1px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.75)]"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-[21px] font-extrabold text-[#eeeed2] tracking-tight leading-tight">
                Chess Century
              </h1>
              <p className="text-xs text-[#9ea693] mt-0.5 truncate">
                Stockfish 19 Edition · Dev: sepram
              </p>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#9ea693] mb-2">
            Mode Permainan
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onSelectMode('bot')}
              className={`rounded-2xl p-3.5 flex flex-col items-center gap-1.5 border-2 transition-all duration-150 cursor-pointer ${
                selectedMode === 'bot'
                  ? 'border-[#81b64c] bg-gradient-to-b from-[#2f3b28] to-[#222a1d] shadow-[0_6px_20px_rgba(129,182,76,0.2)]'
                  : 'border-[#353f30] bg-[#1a2017] hover:border-[#4b5944]'
              }`}
            >
              <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
                <rect x="6" y="8" width="24" height="20" rx="6" fill="#2a3824" stroke="#81b64c" strokeWidth="2" />
                <path d="M18 4v4M13 17h3M20 17h3M13 23h10" stroke="#eeeed2" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="14.5" cy="17" r="1.5" fill="#81b64c" />
                <circle cx="21.5" cy="17" r="1.5" fill="#81b64c" />
              </svg>
              <span className="text-sm font-bold text-[#f3f2e8] whitespace-nowrap">Lawan Bot</span>
              <span className="text-[11px] text-[#9ea693] whitespace-nowrap">Stockfish 19 &amp; UCI</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('pvp')}
              className={`rounded-2xl p-3.5 flex flex-col items-center gap-1.5 border-2 transition-all duration-150 cursor-pointer ${
                selectedMode === 'pvp'
                  ? 'border-[#81b64c] bg-gradient-to-b from-[#2f3b28] to-[#222a1d] shadow-[0_6px_20px_rgba(129,182,76,0.2)]'
                  : 'border-[#353f30] bg-[#1a2017] hover:border-[#4b5944]'
              }`}
            >
              <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
                <circle cx="13" cy="13" r="4.5" fill="#eeeed2" />
                <circle cx="23.5" cy="14" r="3.8" fill="#81b64c" />
                <path d="M5.5 28c.5-5.5 3.5-8 7.5-8s7 2.5 7.5 8" stroke="#eeeed2" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M21 21c3.5.4 6.2 2.5 6.8 7" stroke="#81b64c" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-bold text-[#f3f2e8] whitespace-nowrap">Lawan Teman</span>
              <span className="text-[11px] text-[#9ea693] whitespace-nowrap">2 Pemain Lokal</span>
            </button>
          </div>
        </div>

        {/* Bot Selection Options */}
        {selectedMode === 'bot' && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-[#9ea693]">
                  Pilih Lawan Bot
                </span>
                <span className={`text-xs font-bold ${statusColorClass}`}>
                  {engineStatusText}
                </span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar">
                {allBots.map((bot) => {
                  const isSelected = bot.id === activeBotId;
                  return (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() => onSelectBot(bot.id)}
                      className={`flex-[0_0_108px] rounded-[14px] p-2.5 flex flex-col items-center gap-1.5 border-2 transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'border-[#81b64c] bg-gradient-to-b from-[#2d3826] to-[#1d2419] shadow-[0_6px_14px_rgba(129,182,76,0.25)] -translate-y-0.5'
                          : 'border-[#333d2e] bg-[#171c14] hover:border-[#4a5743]'
                      }`}
                    >
                      <div className="w-[54px] h-[54px] rounded-[13px] overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.45)]">
                        <BotAvatarIcon avatarKey={bot.avatarKey} className="w-full h-full block" />
                      </div>
                      <span className="text-xs font-bold text-[#eeeed2] leading-tight text-center">
                        {bot.name}
                      </span>
                      <span className="text-[10.5px] font-bold text-[#e8b84b] tabular-nums">
                        Elo {bot.elo}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-[#171c14] border border-[#313a2c] rounded-xl px-3 py-2 text-xs text-[#ced5c4] mt-1">
                {activeBot?.desc || activeBot?.name}
              </div>
            </div>

            {/* Play As Color */}
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-[#9ea693] mb-2">
                Bermain Sebagai
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'w', label: 'Putih', pieceKey: 'wk' },
                    { id: 'b', label: 'Hitam', pieceKey: 'bk' },
                    { id: 'r', label: 'Acak', pieceKey: null },
                  ] as const
                ).map((opt) => {
                  const active = selectedColorPref === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectColorPref(opt.id)}
                      className={`rounded-xl py-2.5 px-2 text-[13px] font-bold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-gradient-to-br from-[#639236] to-[#81b64c] text-white border-[#97cc62]'
                          : 'bg-[#171c14] text-[#9ea693] border-[#3b4635] hover:text-[#eeeed2]'
                      }`}
                    >
                      {opt.pieceKey ? (
                        <ChessPieceIcon pieceKey={opt.pieceKey} className="w-4 h-4 shrink-0" />
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 shrink-0">
                          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                        </svg>
                      )}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Time Control */}
        <div>
          <label htmlFor="menu-time-control" className="block text-[11px] font-bold tracking-wider uppercase text-[#9ea693] mb-2">
            Kontrol Waktu (Timer)
          </label>
          <select
            id="menu-time-control"
            value={timeControl}
            onChange={(e) => onChangeTimeControl(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#3e4938] bg-[#171c14] text-[#f3f2e8] text-[13.5px] font-semibold focus:outline-none focus:border-[#81b64c]"
          >
            {TIME_CONTROLS.map((tc) => (
              <option key={tc.value} value={tc.value}>
                {tc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start Button */}
        <button
          type="button"
          onClick={onStartGame}
          className="w-full rounded-xl bg-gradient-to-b from-[#8ec555] to-[#689937] text-white text-base font-extrabold py-3.5 px-4 flex items-center justify-center gap-2 shadow-[0_5px_0_#486b24,0_10px_22px_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-[0_2px_0_#486b24] transition-all cursor-pointer whitespace-nowrap"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>Mulai Pertandingan</span>
        </button>

        {/* Sub Button */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full rounded-xl bg-[#262e22] hover:bg-[#2e3829] text-[#eeeed2] border border-[#414d3b] text-[13px] font-bold py-2.5 px-3 flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 shrink-0">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.2.64.78 1.08 1.45 1.1H21a2 2 0 1 1 0 4h-.09c-.67.02-1.25.46-1.51 1.1z" />
            </svg>
            <span>Pengaturan &amp; Engine UCI</span>
          </button>
        </div>
      </div>
    </div>
  );
};
