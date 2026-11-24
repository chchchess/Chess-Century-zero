import React from 'react';
import { BOARD_THEMES } from '../data/assets';
import type { BoardThemeId, PieceStyleId, UserPreferences } from '../types/chess';
import { ChessPieceIcon } from './ChessSvgs';

interface SettingsModalProps {
  open: boolean;
  prefs: UserPreferences;
  activeBotName?: string;
  onUpdatePrefs: (next: Partial<UserPreferences>) => void;
  onOpenInstaller: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  prefs,
  activeBotName,
  onUpdatePrefs,
  onOpenInstaller,
  onClose,
}) => {
  if (!open) return null;

  const theme = BOARD_THEMES[prefs.theme] || BOARD_THEMES.green;
  const styleLabel =
    prefs.pieceStyle === '3d' ? '3D Timbul' : prefs.pieceStyle === 'classic' ? 'Classic' : 'Modern';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3.5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[470px] max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#272f22] to-[#1d2219] rounded-[18px] border border-[#495641] p-4.5 shadow-[0_24px_54px_rgba(0,0,0,0.7)] flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-[#384331] pb-2.5">
          <h3 className="text-[16.5px] font-bold text-[#eeeed2]">Pengaturan Tampilan &amp; Suara</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Pengaturan"
            className="w-8 h-8 rounded-full bg-[#333c2e] hover:bg-[#414c3b] text-[#eeeed2] text-lg flex items-center justify-center cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Live Mini Board Preview */}
        <div className="flex items-center gap-3 bg-[#161b13] border border-[#384331] rounded-[13px] p-2.5">
          <div className={`w-[82px] h-[82px] rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 shrink-0 style-${prefs.pieceStyle}`}>
            <div className="flex items-center justify-center" style={{ backgroundColor: theme.light }}>
              <ChessPieceIcon pieceKey="wk" className="w-[94%] h-[94%] piece-svg" />
            </div>
            <div className="flex items-center justify-center" style={{ backgroundColor: theme.dark }}>
              <ChessPieceIcon pieceKey="bn" className="w-[94%] h-[94%] piece-svg" />
            </div>
            <div className="flex items-center justify-center" style={{ backgroundColor: theme.dark }}>
              <ChessPieceIcon pieceKey="wq" className="w-[94%] h-[94%] piece-svg" />
            </div>
            <div className="flex items-center justify-center" style={{ backgroundColor: theme.light }}>
              <ChessPieceIcon pieceKey="bp" className="w-[94%] h-[94%] piece-svg" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-bold text-[#eeeed2]">
              {theme.label} · {styleLabel}
            </div>
            <div className="text-[11.5px] text-[#9ea693] mt-1">
              Perubahan langsung tersimpan dan tampil pada papan.
            </div>
          </div>
        </div>

        {/* Board Themes */}
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#9ea693] mb-1.5">
            Tema Papan
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => {
              const t = BOARD_THEMES[id];
              const active = prefs.theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onUpdatePrefs({ theme: id })}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'border-[#81b64c] bg-[#2d3826] text-[#f3f2e8]'
                      : 'border-[#353f30] bg-[#171c14] text-[#f3f2e8] hover:border-[#4c5a45]'
                  }`}
                >
                  <span
                    className="w-[22px] h-[22px] rounded-md shrink-0 border border-white/25"
                    style={{ background: `linear-gradient(135deg, ${t.light} 50%, ${t.dark} 50%)` }}
                  />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Piece Styles */}
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#9ea693] mb-1.5">
            Gaya Bidak
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'modern', label: 'Modern' },
                { id: 'classic', label: 'Classic' },
                { id: '3d', label: '3D Timbul' },
              ] as { id: PieceStyleId; label: string }[]
            ).map((opt) => {
              const active = prefs.pieceStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdatePrefs({ pieceStyle: opt.id })}
                  className={`rounded-xl py-2 px-2 text-[13px] font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-br from-[#639236] to-[#81b64c] text-white border-[#97cc62]'
                      : 'bg-[#171c14] text-[#9ea693] border-[#3b4635] hover:text-[#eeeed2]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between bg-[#171c14] border border-[#353f30] rounded-xl px-3 py-2.5 cursor-pointer">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#f3f2e8]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[#81b64c] shrink-0">
                <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              Suara Khas Catur
            </span>
            <input
              type="checkbox"
              checked={prefs.sound}
              onChange={(e) => onUpdatePrefs({ sound: e.target.checked })}
              className="sr-only peer"
            />
            <span className="relative w-11 h-6 bg-[#3f473a] rounded-full peer-checked:bg-[#81b64c] transition-colors after:content-[''] after:absolute after:w-[18px] after:h-[18px] after:bg-white after:rounded-full after:left-[3px] after:bottom-[3px] after:transition-transform peer-checked:after:translate-x-5" />
          </label>

          <label className="flex items-center justify-between bg-[#171c14] border border-[#353f30] rounded-xl px-3 py-2.5 cursor-pointer">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#f3f2e8]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[#81b64c] shrink-0">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
              </svg>
              Deteksi Brilliant / Blunder
            </span>
            <input
              type="checkbox"
              checked={prefs.analysis}
              onChange={(e) => onUpdatePrefs({ analysis: e.target.checked })}
              className="sr-only peer"
            />
            <span className="relative w-11 h-6 bg-[#3f473a] rounded-full peer-checked:bg-[#81b64c] transition-colors after:content-[''] after:absolute after:w-[18px] after:h-[18px] after:bg-white after:rounded-full after:left-[3px] after:bottom-[3px] after:transition-transform peer-checked:after:translate-x-5" />
          </label>

          <label className="flex items-center justify-between bg-[#171c14] border border-[#353f30] rounded-xl px-3 py-2.5 cursor-pointer">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#f3f2e8]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[#81b64c] shrink-0">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 3v18" />
              </svg>
              Koordinat Papan (a-h, 1-8)
            </span>
            <input
              type="checkbox"
              checked={prefs.coords}
              onChange={(e) => onUpdatePrefs({ coords: e.target.checked })}
              className="sr-only peer"
            />
            <span className="relative w-11 h-6 bg-[#3f473a] rounded-full peer-checked:bg-[#81b64c] transition-colors after:content-[''] after:absolute after:w-[18px] after:h-[18px] after:bg-white after:rounded-full after:left-[3px] after:bottom-[3px] after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>

        {/* Engine UCI Installer Access */}
        <div className="pt-1 border-t border-[#384331]">
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#9ea693] mb-1.5">
            Engine &amp; Bot Tambahan
          </div>
          <button
            type="button"
            onClick={onOpenInstaller}
            className="w-full rounded-xl bg-[#171c14] hover:bg-[#242c20] border border-[#3e4b38] hover:border-[#81b64c]/70 px-3 py-2.5 flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#262f22] border border-[#3e4b38] flex items-center justify-center shrink-0 text-[#81b64c]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <rect x="4" y="4" width="16" height="16" rx="3" />
                  <path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
                </svg>
              </div>
              <div className="text-left min-w-0">
                <div className="text-[13px] font-bold text-[#eeeed2]">Install Bot UCI</div>
                <div className="text-[11px] text-[#9ea693] truncate">
                  {activeBotName ? `Aktif: ${activeBotName} · Upload .js / CDN / Bridge` : 'Upload .js, URL CDN, atau Bridge .exe'}
                </div>
              </div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#9ea693] shrink-0">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
