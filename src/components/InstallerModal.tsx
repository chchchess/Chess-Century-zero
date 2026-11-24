import React, { useState } from 'react';
import { buildUciBridgeScript } from '../engine/uciManager';
import type { BotProfile } from '../types/chess';

interface InstallerModalProps {
  open: boolean;
  allBots: BotProfile[];
  activeBotId: string;
  uciLogs: string[];
  onClose: () => void;
  onSelectBot: (botId: string) => void;
  onDeleteBot: (botId: string) => void;
  onInstallWorkerCode: (name: string, code: string, desc: string) => Promise<void>;
  onInstallWs: (name: string, url: string) => Promise<void>;
  onLog: (msg: string) => void;
}

type TabId = 'installed' | 'upload' | 'cdn' | 'bridge';

export const InstallerModal: React.FC<InstallerModalProps> = ({
  open,
  allBots,
  activeBotId,
  uciLogs,
  onClose,
  onSelectBot,
  onDeleteBot,
  onInstallWorkerCode,
  onInstallWs,
  onLog,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('installed');
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [wsName, setWsName] = useState('Komodo / Stockfish .exe');
  const [wsUrl, setWsUrl] = useState('ws://localhost:8765');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!open) return null;

  const showFeedback = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
  };

  const handleInstallUrl = async (name: string, url: string) => {
    setBusy(true);
    setFeedback(null);
    onLog(`Mengunduh ${url}`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const code = await res.text();
      await onInstallWorkerCode(name, code, `UCI JS (${Math.round(code.length / 1024)} KB)`);
      showFeedback('ok', `${name} berhasil dipasang.`);
      setActiveTab('installed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunduh';
      onLog(`Error: ${msg}`);
      showFeedback('err', `Gagal memasang: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      showFeedback('err', 'Pilih file .js terlebih dahulu.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const code = await uploadFile.text();
      const name = uploadName.trim() || uploadFile.name.replace(/\.js$/i, '');
      await onInstallWorkerCode(name, code, `Lokal (${Math.round(code.length / 1024)} KB)`);
      showFeedback('ok', `${name} berhasil dipasang.`);
      setUploadFile(null);
      setUploadName('');
      setActiveTab('installed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file';
      showFeedback('err', `Gagal: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleWsSubmit = async () => {
    const trimmedUrl = wsUrl.trim();
    if (!trimmedUrl.startsWith('ws://') && !trimmedUrl.startsWith('wss://')) {
      showFeedback('err', 'Gunakan protokol ws:// atau wss://');
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await onInstallWs(wsName.trim() || 'Komodo .exe', trimmedUrl);
      showFeedback('ok', 'Bridge berhasil dihubungkan.');
      setActiveTab('installed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal konek';
      showFeedback('err', `Gagal: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadBridge = () => {
    const py = buildUciBridgeScript();
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([py], { type: 'text/x-python' }));
    a.href = url;
    a.download = 'uci_bridge.py';
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('ok', 'uci_bridge.py diunduh.');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3.5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[490px] max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#272f22] to-[#1d2219] rounded-[18px] border border-[#495641] p-4.5 shadow-[0_24px_54px_rgba(0,0,0,0.7)] flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#384331] pb-2.5">
          <h3 className="text-[16.5px] font-bold text-[#eeeed2]">Manajer Engine UCI</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Manajer Engine"
            className="w-8 h-8 rounded-full bg-[#333c2e] hover:bg-[#414c3b] text-[#eeeed2] text-lg flex items-center justify-center cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Tab Bar */}
        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              { id: 'installed', label: 'Terpasang' },
              { id: 'upload', label: 'Upload .js' },
              { id: 'cdn', label: 'URL / CDN' },
              { id: 'bridge', label: 'Bridge .exe' },
            ] as { id: TabId; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id);
                setFeedback(null);
              }}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-[#81b64c] text-white border-[#98ce62]'
                  : 'bg-[#171c14] text-[#9ea693] border-[#394433] hover:text-[#eeeed2]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
              feedback.type === 'ok'
                ? 'bg-[#1f3322] border-[#4b854f] text-[#b4eeb8]'
                : 'bg-[#381d1d] border-[#8c3d3d] text-[#ffb3b0]'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'installed' && (
          <div className="bg-[#171c14] border border-[#353f30] rounded-xl p-3 flex flex-col gap-2.5">
            <div className="text-xs text-[#9ea693] leading-relaxed bg-[#121610] p-2.5 rounded-lg border border-[#2a3326]">
              Engine bawaan siap pakai kapan saja. Anda juga bisa menambah engine UCI JavaScript atau Komodo (.exe) via Bridge.
            </div>
            <div className="flex flex-col gap-2 max-h-[210px] overflow-y-auto">
              {allBots.map((bot) => {
                const isActive = bot.id === activeBotId;
                return (
                  <div
                    key={bot.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
                      isActive
                        ? 'bg-[#36422f] border-[#eeeed2]/70'
                        : 'bg-[#293125] border-[#434f3c]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-[#eeeed2] truncate">
                        {bot.name} ({bot.elo})
                      </div>
                      <div className="text-[11px] text-[#9ea693] truncate">{bot.desc}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => onSelectBot(bot.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#81b64c] text-white cursor-pointer whitespace-nowrap"
                        >
                          Pakai
                        </button>
                      )}
                      {bot.custom && (
                        <button
                          type="button"
                          onClick={() => onDeleteBot(bot.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#d9534f]/20 text-[#ff9c99] border border-[#d9534f] cursor-pointer whitespace-nowrap"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="bg-[#171c14] border border-[#353f30] rounded-xl p-3 flex flex-col gap-2.5">
            <div className="text-xs text-[#9ea693] leading-relaxed bg-[#121610] p-2.5 rounded-lg border border-[#2a3326]">
              Pilih file engine UCI JavaScript dari perangkat Anda (misal <code>stockfish.js</code> atau <code>lozza.js</code>).
            </div>
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="Nama Engine"
              className="w-full px-3 py-2 rounded-xl border border-[#3e4938] bg-[#121610] text-[#f3f2e8] text-[13px] font-semibold"
            />
            <input
              type="file"
              accept=".js,text/javascript,application/javascript"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 rounded-xl border border-[#3e4938] bg-[#121610] text-[#f3f2e8] text-xs font-semibold file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-[#293125] file:text-[#eeeed2] file:font-bold"
            />
            <button
              type="button"
              disabled={busy}
              onClick={handleUploadSubmit}
              className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#8ec555] to-[#689937] text-white text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Memasang...' : 'Pasang Engine'}
            </button>
          </div>
        )}

        {activeTab === 'cdn' && (
          <div className="bg-[#171c14] border border-[#353f30] rounded-xl p-3 flex flex-col gap-2.5">
            <div className="text-xs text-[#9ea693] leading-relaxed bg-[#121610] p-2.5 rounded-lg border border-[#2a3326]">
              Unduh Stockfish 10.0.2 (JS) dari CDN atau pasang engine UCI lain via URL.
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                handleInstallUrl(
                  'Stockfish 10.0.2',
                  'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js'
                )
              }
              className="w-full py-2.5 rounded-xl bg-[#262e22] hover:bg-[#313b2c] border border-[#414d3b] text-[#eeeed2] text-[13px] font-bold cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Mengunduh...' : 'Download Stockfish 10.0.2 (JS)'}
            </button>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nama Bot Custom"
              className="w-full px-3 py-2 rounded-xl border border-[#3e4938] bg-[#121610] text-[#f3f2e8] text-[13px] font-semibold"
            />
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://.../engine.js"
              className="w-full px-3 py-2 rounded-xl border border-[#3e4938] bg-[#121610] text-[#f3f2e8] text-[13px] font-semibold"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!customUrl.trim()) {
                  showFeedback('err', 'Isi URL engine terlebih dahulu.');
                  return;
                }
                void handleInstallUrl(customName.trim() || 'Bot UCI', customUrl.trim());
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#8ec555] to-[#689937] text-white text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              Pasang dari URL
            </button>
          </div>
        )}

        {activeTab === 'bridge' && (
          <div className="bg-[#171c14] border border-[#353f30] rounded-xl p-3 flex flex-col gap-2.5">
            <div className="text-xs text-[#9ea693] leading-relaxed bg-[#121610] p-2.5 rounded-lg border border-[#2a3326]">
              Hubungkan engine PC <code>.exe</code> (Komodo Dragon, Stockfish Full, Lc0) melalui bridge Python lokal.
            </div>
            <button
              type="button"
              onClick={handleDownloadBridge}
              className="w-full py-2.5 rounded-xl bg-[#262e22] hover:bg-[#313b2c] border border-[#414d3b] text-[#eeeed2] text-[13px] font-bold cursor-pointer"
            >
              Download uci_bridge.py
            </button>
            <input
              type="text"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              placeholder="Nama Bridge Bot"
              className="w-full px-3 py-2 rounded-xl border border-[#3e4938] bg-[#121610] text-[#f3f2e8] text-[13px] font-semibold"
            />
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://localhost:8765"
              className="w-full px-3 py-2 rounded-xl border border-[#3e4938] bg-[#121610] text-[#f3f2e8] text-[13px] font-semibold"
            />
            <button
              type="button"
              disabled={busy}
              onClick={handleWsSubmit}
              className="w-full py-2.5 rounded-xl bg-gradient-to-b from-[#8ec555] to-[#689937] text-white text-sm font-bold cursor-pointer disabled:opacity-50"
            >
              {busy ? 'Menghubungkan...' : 'Hubungkan Bridge'}
            </button>
          </div>
        )}

        {/* UCI Console */}
        <div>
          <div className="text-[11px] font-bold tracking-wider uppercase text-[#9ea693] mb-1">
            Log Engine UCI
          </div>
          <div className="bg-[#0f120d] text-[#a8d882] font-mono-tabular text-[11px] p-2.5 rounded-lg h-[82px] overflow-y-auto border border-[#313a2c] whitespace-pre-wrap">
            {uciLogs.join('\n')}
          </div>
        </div>
      </div>
    </div>
  );
};
