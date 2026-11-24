import { useCallback, useEffect, useRef, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { InstallerModal } from './components/InstallerModal';
import { MenuScreen } from './components/MenuScreen';
import { PromoModal } from './components/PromoModal';
import { SettingsModal } from './components/SettingsModal';
import { PRESET_BOTS } from './data/assets';
import {
  analyzeMoveQuality,
  applyMoveToBoard,
  cloneState,
  computeBuiltinBotMove,
  createInitialBoard,
  detectOpeningInfo,
  getAllLegalMoves,
  getLegalMovesForSquare,
  isInsufficientMaterial,
  isKingInCheck,
  minimax,
  moveToUci,
  toAlgebraic,
  uciToMove,
} from './engine/chessRules';
import { playChessSound } from './engine/sound';
import { dbDeleteEngine, dbGetAllEngines, dbPutEngine } from './engine/uciManager';
import type {
  BotProfile,
  ChessMove,
  ColorPreference,
  GameMode,
  GameState,
  PieceColor,
  SquareCoord,
  UserPreferences,
} from './types/chess';

const DEFAULT_PREFS: UserPreferences = {
  theme: 'green',
  pieceStyle: 'modern',
  sound: true,
  analysis: true,
  coords: true,
};

function loadInitialPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem('cc_prefs');
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'game'>('menu');
  const [prefs, setPrefs] = useState<UserPreferences>(loadInitialPrefs);

  const [selectedMode, setSelectedMode] = useState<GameMode>('bot');
  const [selectedColorPref, setSelectedColorPref] = useState<ColorPreference>('w');
  const [timeControl, setTimeControl] = useState<string>('300|0');

  const [allBots, setAllBots] = useState<BotProfile[]>(PRESET_BOTS);
  const [activeBotId, setActiveBotId] = useState<string>(() => {
    try {
      return localStorage.getItem('cc_active_bot') || 'sf19-max';
    } catch {
      return 'sf19-max';
    }
  });
  const [engineStatusText, setEngineStatusText] = useState<string>('Siap');
  const [engineStatusTone, setEngineStatusTone] = useState<'ready' | 'warn' | 'error'>('ready');
  const [uciLogs, setUciLogs] = useState<string[]>(['[Chess Century] Siap.']);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installerOpen, setInstallerOpen] = useState(false);

  // Active Match State
  const [activeVsBot, setActiveVsBot] = useState(true);
  const [activeHumanColor, setActiveHumanColor] = useState<PieceColor>('w');
  const [activeBotColor, setActiveBotColor] = useState<PieceColor>('b');
  const [flipped, setFlipped] = useState(false);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<GameState[]>([]);
  const [selectedSq, setSelectedSq] = useState<SquareCoord | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<ChessMove[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<ChessMove[] | null>(null);
  const [activeHintMove, setActiveHintMove] = useState<ChessMove | null>(null);
  const [lastMoveAnim, setLastMoveAnim] = useState<{
    fr: number;
    fc: number;
    tr: number;
    tc: number;
    castling?: 'K' | 'Q';
    skip: boolean;
  } | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [drawOfferedPly, setDrawOfferedPly] = useState(-1);
  const [gameEpoch, setGameEpoch] = useState(0);

  // UCI Workers & WebSocket refs
  const sf19WorkerRef = useRef<Worker | null>(null);
  const sf19ReadyRef = useRef(false);
  const customWorkerRef = useRef<Worker | null>(null);
  const customWorkerUrlRef = useRef<string | null>(null);
  const customWsRef = useRef<WebSocket | null>(null);
  const customUciReadyRef = useRef(false);
  const pendingUciResolveRef = useRef<((bestmove: string) => void) | null>(null);

  const botTimeoutRef = useRef<number | null>(null);
  const searchTokenRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);

  // Keep latest refs for timers/callbacks
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const allBotsRef = useRef(allBots);
  allBotsRef.current = allBots;
  const activeBotIdRef = useRef(activeBotId);
  activeBotIdRef.current = activeBotId;

  const logUci = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString('id-ID', { hour12: false });
    setUciLogs((prev) => [...prev.slice(-80), `[${t}] ${msg}`]);
  }, []);

  const updatePrefs = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('cc_prefs', JSON.stringify(next));
      } catch {
        // ignore
      }
      if (patch.sound === true) {
        playChessSound('move', true);
      }
      return next;
    });
  }, []);

  const sendCustomUci = useCallback((cmd: string) => {
    if (customWorkerRef.current) {
      customWorkerRef.current.postMessage(cmd);
    } else if (customWsRef.current && customWsRef.current.readyState === WebSocket.OPEN) {
      customWsRef.current.send(cmd);
    }
  }, []);

  const disconnectCustom = useCallback(() => {
    if (customWorkerRef.current) {
      customWorkerRef.current.terminate();
      customWorkerRef.current = null;
    }
    if (customWorkerUrlRef.current) {
      URL.revokeObjectURL(customWorkerUrlRef.current);
      customWorkerUrlRef.current = null;
    }
    if (customWsRef.current) {
      customWsRef.current.close();
      customWsRef.current = null;
    }
    customUciReadyRef.current = false;
  }, []);

  const onUciMessage = useCallback(
    (line: unknown, src: string) => {
      if (!line || typeof line !== 'string') return;
      const t = line.trim();
      if (t.startsWith('id ') || t === 'uciok' || t === 'readyok' || t.startsWith('bestmove')) {
        logUci(`[${src}] ${t}`);
      }
      if (t === 'uciok') {
        if (src === 'SF19' && sf19WorkerRef.current) {
          sf19WorkerRef.current.postMessage('isready');
        } else {
          sendCustomUci('isready');
        }
      } else if (t === 'readyok') {
        if (src === 'SF19') {
          sf19ReadyRef.current = true;
          setEngineStatusText('Stockfish 19 Siap');
          setEngineStatusTone('ready');
        } else {
          customUciReadyRef.current = true;
          setEngineStatusText('UCI Custom Siap');
          setEngineStatusTone('ready');
        }
      } else if (t.startsWith('bestmove ') && pendingUciResolveRef.current) {
        const resolve = pendingUciResolveRef.current;
        pendingUciResolveRef.current = null;
        resolve(t.split(/\s+/)[1]);
      }
    },
    [logUci, sendCustomUci]
  );

  const selectBot = useCallback(
    async (botId: string, botsList?: BotProfile[]) => {
      const list = botsList || allBotsRef.current;
      const bot = list.find((b) => b.id === botId) || PRESET_BOTS[0];
      setActiveBotId(bot.id);
      try {
        localStorage.setItem('cc_active_bot', bot.id);
      } catch {
        // ignore
      }
      disconnectCustom();

      if ((bot.kind === 'worker-code' && bot.code) || (bot.kind === 'ws' && bot.url)) {
        setEngineStatusText('Menghubungkan...');
        setEngineStatusTone('warn');
        try {
          if (bot.kind === 'worker-code' && bot.code) {
            const url = URL.createObjectURL(new Blob([bot.code], { type: 'application/javascript' }));
            customWorkerUrlRef.current = url;
            const w = new Worker(url);
            customWorkerRef.current = w;
            w.onmessage = (ev) => onUciMessage(ev.data, bot.name);
            sendCustomUci('uci');
          } else if (bot.kind === 'ws' && bot.url) {
            await new Promise<void>((res, rej) => {
              const ws = new WebSocket(bot.url!);
              const to = window.setTimeout(() => {
                ws.close();
                rej(new Error('Timeout'));
              }, 3500);
              ws.onopen = () => {
                clearTimeout(to);
                customWsRef.current = ws;
                sendCustomUci('uci');
                res();
              };
              ws.onmessage = (ev) => {
                String(ev.data)
                  .split(/\r?\n/)
                  .forEach((l) => onUciMessage(l, bot.name));
              };
              ws.onerror = () => {
                clearTimeout(to);
                rej(new Error('Gagal'));
              };
            });
          }
        } catch {
          setEngineStatusText('Gagal Konek');
          setEngineStatusTone('error');
        }
      } else if (bot.kind === 'sf19') {
        setEngineStatusText(sf19ReadyRef.current ? 'Stockfish 19 Siap' : 'Engine Siap');
        setEngineStatusTone('ready');
      } else {
        setEngineStatusText('Offline Siap');
        setEngineStatusTone('ready');
      }
    },
    [disconnectCustom, onUciMessage, sendCustomUci]
  );

  // Boot bundled SF19 if present & load custom engines from IndexedDB
  useEffect(() => {
    let mounted = true;

    const bootBundledSF19 = async () => {
      try {
        const res = await fetch('engines/stockfish-19-lite-single.js', { method: 'GET' });
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || contentType.includes('text/html')) {
          if (mounted) {
            setEngineStatusText('Engine Siap');
            setEngineStatusTone('ready');
          }
          return;
        }
        const preview = (await res.text()).trimStart();
        if (!preview || preview.startsWith('<')) {
          if (mounted) {
            setEngineStatusText('Engine Siap');
            setEngineStatusTone('ready');
          }
          return;
        }

        const w = new Worker('engines/stockfish-19-lite-single.js');
        const to = window.setTimeout(() => {
          if (!sf19ReadyRef.current) {
            w.terminate();
            if (mounted) {
              setEngineStatusText('Engine Siap');
              setEngineStatusTone('ready');
            }
          }
        }, 2500);
        w.onmessage = (ev) => {
          if (String(ev.data).includes('readyok')) clearTimeout(to);
          onUciMessage(ev.data, 'SF19');
        };
        w.onerror = () => {
          clearTimeout(to);
          w.terminate();
          if (mounted) {
            setEngineStatusText('Engine Siap');
            setEngineStatusTone('ready');
          }
        };
        sf19WorkerRef.current = w;
        w.postMessage('uci');
      } catch {
        if (mounted) {
          setEngineStatusText('Engine Siap');
          setEngineStatusTone('ready');
        }
      }
    };

    void bootBundledSF19();

    void (async () => {
      const saved = await dbGetAllEngines();
      if (!mounted) return;
      if (saved.length > 0) {
        const merged = [
          ...PRESET_BOTS,
          ...saved.map((s) => ({
            ...s,
            custom: true,
            avatarKey: s.avatarKey || ('sepram' as const),
            elo: s.elo || 'Custom',
          })),
        ];
        setAllBots(merged);
        await selectBot(activeBotIdRef.current, merged);
      }
    })();

    return () => {
      mounted = false;
      if (sf19WorkerRef.current) sf19WorkerRef.current.terminate();
      disconnectCustom();
    };
  }, [disconnectCustom, onUciMessage, selectBot]);

  const queryUci = useCallback(
    (
      sendFn: (cmd: string) => void,
      currentState: GameState,
      movetime: number,
      limitElo: number | undefined,
      skill: number | undefined,
      tok: number
    ): Promise<ChessMove | null> => {
      return new Promise((res) => {
        if (limitElo && limitElo >= 1320) {
          sendFn('setoption name UCI_LimitStrength value true');
          sendFn(`setoption name UCI_Elo value ${limitElo}`);
        } else {
          sendFn('setoption name UCI_LimitStrength value false');
          sendFn(`setoption name Skill Level value ${skill ?? 20}`);
        }
        sendFn(
          'position startpos' +
            (currentState.uciMoves.length ? ' moves ' + currentState.uciMoves.join(' ') : '')
        );
        const wd = window.setTimeout(() => {
          if (pendingUciResolveRef.current) sendFn('stop');
        }, movetime + 1800);
        pendingUciResolveRef.current = (bm) => {
          clearTimeout(wd);
          res(tok === searchTokenRef.current ? uciToMove(currentState, bm) : null);
        };
        sendFn(`go movetime ${movetime}`);
      });
    },
    []
  );

  const executeMove = useCallback(
    (move: ChessMove, viaDrag = false, fromStrongEngine = false) => {
      const current = gameStateRef.current;
      if (!current || current.gameOver) return;

      const prev = cloneState(current);
      const mc = prev.turn;
      const nc: PieceColor = mc === 'w' ? 'b' : 'w';
      const { nb, castling, enPassant, capturedPiece } = applyMoveToBoard(prev, move);
      const quality = analyzeMoveQuality(prev, move, nb, prefsRef.current.analysis, fromStrongEngine);

      const nextState = cloneState(prev);
      if (capturedPiece) nextState.captured[mc].push(capturedPiece);
      nextState.board = nb;
      nextState.castling = castling;
      nextState.enPassant = enPassant;
      nextState.turn = nc;
      nextState.lastMove = { fr: move.fr, fc: move.fc, tr: move.tr, tc: move.tc };
      nextState.uciMoves.push(moveToUci(move));
      const openingInfo = detectOpeningInfo(nextState.uciMoves);
      nextState.openingName = openingInfo.name;
      nextState.openingEco = openingInfo.eco;
      if (!nextState.timers.unlimited && nextState.timers.inc > 0) {
        nextState.timers[mc] += nextState.timers.inc;
      }

      const chk = isKingInCheck(nextState.board, nc);
      const nx = getAllLegalMoves(nextState);
      const mate = chk && nx.length === 0;
      const stale = !chk && nx.length === 0;
      const draw = isInsufficientMaterial(nextState.board);

      nextState.moveNotations.push(toAlgebraic(prev, move, chk, mate));
      nextState.moveQualities.push(quality);

      const cn = nc === 'w' ? 'Putih' : 'Hitam';
      const pn = mc === 'w' ? 'Putih' : 'Hitam';

      if (mate) {
        nextState.gameOver = true;
        nextState.statusText = `Skakmat! ${pn} Menang!`;
        nextState.statusType = 'gameover';
        playChessSound('gameover', prefsRef.current.sound);
      } else if (stale) {
        nextState.gameOver = true;
        nextState.statusText = 'Remis (Stalemate)!';
        nextState.statusType = 'gameover';
        playChessSound('gameover', prefsRef.current.sound);
      } else if (draw) {
        nextState.gameOver = true;
        nextState.statusText = 'Remis (Materi Tak Cukup)!';
        nextState.statusType = 'gameover';
        playChessSound('gameover', prefsRef.current.sound);
      } else if (chk) {
        nextState.statusText = `Skak! Giliran ${cn}`;
        nextState.statusType = 'check';
        playChessSound('check', prefsRef.current.sound);
      } else {
        nextState.statusText = `Giliran ${cn} melangkah`;
        nextState.statusType = 'normal';
        playChessSound(
          move.promo
            ? 'promote'
            : move.castling
              ? 'castle'
              : move.capture
                ? 'capture'
                : 'move',
          prefsRef.current.sound
        );
      }

      setHistory((h) => [...h, prev]);
      setGameState(nextState);
      setSelectedSq(null);
      setLegalMovesForSelected([]);
      setActiveHintMove(null);
      setLastMoveAnim({
        fr: move.fr,
        fc: move.fc,
        tr: move.tr,
        tc: move.tc,
        castling: move.castling,
        skip: viaDrag,
      });
    },
    []
  );

  // Bot turn orchestration
  useEffect(() => {
    if (screen !== 'game' || !gameState || gameState.gameOver || !activeVsBot) return;
    if (gameState.turn !== activeBotColor) return;

    const tok = ++searchTokenRef.current;
    const bot = allBotsRef.current.find((b) => b.id === activeBotIdRef.current) || PRESET_BOTS[0];

    setGameState((prev) => (prev ? { ...prev, statusText: `${bot.name} berpikir...` } : prev));

    const runBot = () => {
      const current = gameStateRef.current;
      if (!current || current.gameOver || tok !== searchTokenRef.current) return;

      if (bot.kind === 'sf19' && sf19ReadyRef.current && sf19WorkerRef.current) {
        void queryUci(
          (c) => sf19WorkerRef.current?.postMessage(c),
          current,
          bot.movetime || 700,
          bot.limitElo,
          bot.skill,
          tok
        ).then((m) => {
          if (!gameStateRef.current?.gameOver && tok === searchTokenRef.current) {
            const isTopBot = bot.id === 'sf19-max' || bot.id === 'sf19-gm' || bot.id === 'sf19-aggro';
            executeMove(m || computeBuiltinBotMove(current, 2)!, false, isTopBot);
          }
        });
      } else if ((bot.kind === 'worker-code' || bot.kind === 'ws') && customUciReadyRef.current) {
        void queryUci(sendCustomUci, current, 850, 0, 20, tok).then((m) => {
          if (!gameStateRef.current?.gameOver && tok === searchTokenRef.current) {
            executeMove(m || computeBuiltinBotMove(current, 2)!, false, true);
          }
        });
      } else {
        // Built-in AI calibrated by preset bot Elo
        const depth =
          bot.id === 'builtin-elo100' || bot.id === 'builtin-elo500' || bot.id === 'builtin-elo900' || bot.id === 'sf19-casual'
            ? 1
            : bot.id === 'sf19-club' || bot.id === 'builtin-sepram'
              ? 2
              : 3;
        const blunderChance =
          bot.id === 'builtin-elo100'
            ? 0.85
            : bot.id === 'builtin-elo500'
              ? 0.6
              : bot.id === 'builtin-elo900'
                ? 0.38
                : bot.id === 'sf19-casual'
                  ? 0.25
                  : bot.id === 'sf19-club'
                    ? 0.1
                    : 0;
        const isTopBot = bot.id === 'sf19-max' || bot.id === 'sf19-gm' || bot.id === 'sf19-aggro';
        const m = computeBuiltinBotMove(current, depth, blunderChance);
        if (m && !gameStateRef.current?.gameOver && tok === searchTokenRef.current) {
          executeMove(m, false, isTopBot);
        }
      }
    };

    botTimeoutRef.current = window.setTimeout(runBot, 260);
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [screen, gameState?.turn, gameState?.uciMoves.length, gameState?.gameOver, activeVsBot, activeBotColor, executeMove, queryUci, sendCustomUci]);

  // Game Clock Timer
  useEffect(() => {
    if (screen !== 'game' || !gameState || gameState.gameOver || gameState.timers.unlimited) {
      return;
    }
    lastTickRef.current = Date.now();
    const id = window.setInterval(() => {
      if (pendingPromotion) {
        lastTickRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const dt = (now - (lastTickRef.current ?? now)) / 1000;
      lastTickRef.current = now;

      setGameState((prev) => {
        if (!prev || prev.gameOver || prev.timers.unlimited) return prev;
        const nextTime = prev.timers[prev.turn] - dt;
        if (nextTime <= 0) {
          if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
          searchTokenRef.current++;
          playChessSound('gameover', prefsRef.current.sound);
          return {
            ...prev,
            timers: { ...prev.timers, [prev.turn]: 0 },
            gameOver: true,
            statusText: `Waktu ${prev.turn === 'w' ? 'Putih' : 'Hitam'} Habis!`,
            statusType: 'gameover',
          };
        }
        return {
          ...prev,
          timers: { ...prev.timers, [prev.turn]: nextTime },
        };
      });
    }, 200);

    return () => clearInterval(id);
  }, [screen, gameState?.gameOver, gameState?.timers.unlimited, pendingPromotion]);

  const startNewGame = useCallback(() => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    searchTokenRef.current++;
    if (sf19ReadyRef.current && sf19WorkerRef.current) {
      sf19WorkerRef.current.postMessage('stop');
      sf19WorkerRef.current.postMessage('ucinewgame');
    }
    if (customUciReadyRef.current) {
      sendCustomUci('stop');
      sendCustomUci('ucinewgame');
    }

    const vsBot = selectedMode === 'bot';
    setActiveVsBot(vsBot);

    if (vsBot) {
      const hCol: PieceColor =
        selectedColorPref === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : selectedColorPref;
      setActiveHumanColor(hCol);
      setActiveBotColor(hCol === 'w' ? 'b' : 'w');
      setFlipped(hCol === 'b');
    } else {
      setActiveHumanColor('w');
      setActiveBotColor('b');
      setFlipped(false);
    }

    const [baseSec, incSec] = timeControl.split('|').map(Number);
    setGameState({
      board: createInitialBoard(),
      turn: 'w',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
      captured: { w: [], b: [] },
      lastMove: null,
      moveNotations: [],
      moveQualities: [],
      uciMoves: [],
      gameOver: false,
      statusText: 'Giliran Putih melangkah',
      statusType: 'normal',
      timers: { w: baseSec, b: baseSec, inc: incSec, unlimited: baseSec === 0 },
      openingName: 'Posisi Awal',
      openingEco: '',
    });
    setHistory([]);
    setSelectedSq(null);
    setLegalMovesForSelected([]);
    setPendingPromotion(null);
    setActiveHintMove(null);
    setLastMoveAnim(null);
    setDrawOfferedPly(-1);
    setGameEpoch((e) => e + 1);
    setScreen('game');
  }, [selectedColorPref, selectedMode, sendCustomUci, timeControl]);

  const handleBackMenu = () => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    searchTokenRef.current++;
    if (sf19ReadyRef.current && sf19WorkerRef.current) sf19WorkerRef.current.postMessage('stop');
    if (customUciReadyRef.current) sendCustomUci('stop');
    setScreen('menu');
  };

  const handleSquareClick = (r: number, c: number) => {
    if (!gameState || gameState.gameOver || pendingPromotion) return;
    if (activeVsBot && gameState.turn === activeBotColor) return;

    const matchingMoves = legalMovesForSelected.filter((m) => m.tr === r && m.tc === c);
    if (matchingMoves.length > 0) {
      if (matchingMoves.some((m) => m.promo)) {
        setPendingPromotion(matchingMoves);
      } else {
        executeMove(matchingMoves[0], false);
      }
      return;
    }

    const p = gameState.board[r][c];
    if (p && p.color === gameState.turn) {
      if (selectedSq && selectedSq.r === r && selectedSq.c === c) {
        setSelectedSq(null);
        setLegalMovesForSelected([]);
      } else {
        setSelectedSq({ r, c });
        setLegalMovesForSelected(getLegalMovesForSquare(gameState, r, c));
      }
    } else {
      setSelectedSq(null);
      setLegalMovesForSelected([]);
    }
  };

  const handleDragDropMove = (fr: number, fc: number, tr: number, tc: number) => {
    if (!gameState || gameState.gameOver || pendingPromotion) return;
    if (activeVsBot && gameState.turn === activeBotColor) return;
    const moves = getLegalMovesForSquare(gameState, fr, fc).filter((m) => m.tr === tr && m.tc === tc);
    if (moves.length > 0) {
      if (moves.some((m) => m.promo)) {
        setPendingPromotion(moves);
      } else {
        executeMove(moves[0], true);
      }
    }
  };

  const handleUndo = () => {
    if (!gameState || history.length === 0 || pendingPromotion) return;
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    searchTokenRef.current++;
    if (sf19ReadyRef.current && sf19WorkerRef.current) sf19WorkerRef.current.postMessage('stop');
    if (customUciReadyRef.current) sendCustomUci('stop');

    const nextHistory = [...history];
    let targetState: GameState | undefined;

    if (!activeVsBot) {
      targetState = nextHistory.pop();
    } else {
      if (
        nextHistory.length === 1 &&
        gameState.turn === activeHumanColor &&
        nextHistory[0].turn === activeBotColor
      ) {
        return;
      }
      do {
        targetState = nextHistory.pop();
      } while (nextHistory.length > 0 && targetState && targetState.turn !== activeHumanColor);
    }

    if (targetState) {
      setHistory(nextHistory);
      setGameState(targetState);
      setSelectedSq(null);
      setLegalMovesForSelected([]);
      setActiveHintMove(null);
      setLastMoveAnim(null);
      setDrawOfferedPly(-1);
    }
  };

  const handleResign = useCallback(() => {
    const current = gameStateRef.current;
    if (!current || current.gameOver) return;
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    searchTokenRef.current++;
    if (sf19ReadyRef.current && sf19WorkerRef.current) sf19WorkerRef.current.postMessage('stop');
    if (customUciReadyRef.current) sendCustomUci('stop');

    const bot = allBotsRef.current.find((b) => b.id === activeBotIdRef.current) || PRESET_BOTS[0];
    const statusText = activeVsBot
      ? `Anda Menyerah · ${bot.name} Menang!`
      : `${current.turn === 'w' ? 'Putih' : 'Hitam'} Menyerah · ${
          current.turn === 'w' ? 'Hitam' : 'Putih'
        } Menang!`;

    setSelectedSq(null);
    setLegalMovesForSelected([]);
    setPendingPromotion(null);
    setActiveHintMove(null);
    setGameState((prev) =>
      prev
        ? {
            ...prev,
            gameOver: true,
            statusText,
            statusType: 'gameover',
          }
        : prev
    );
    playChessSound('gameover', prefsRef.current.sound);
  }, [activeVsBot, sendCustomUci]);

  const handleOfferDraw = useCallback(() => {
    const current = gameStateRef.current;
    if (!current || current.gameOver) return;

    if (!activeVsBot) {
      setSelectedSq(null);
      setLegalMovesForSelected([]);
      setPendingPromotion(null);
      setActiveHintMove(null);
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              gameOver: true,
              statusText: 'Remis (Kesepakatan Bersama)!',
              statusType: 'gameover',
            }
          : prev
      );
      playChessSound('gameover', prefsRef.current.sound);
      return;
    }

    const ply = current.uciMoves.length;
    if (drawOfferedPly === ply) return;

    const bot = allBotsRef.current.find((b) => b.id === activeBotIdRef.current) || PRESET_BOTS[0];
    const botSign = activeBotColor === 'w' ? 1 : -1;
    const evalWhite = minimax(
      {
        board: current.board,
        turn: current.turn,
        castling: current.castling,
        enPassant: current.enPassant,
      },
      2,
      -Infinity,
      Infinity,
      current.turn === 'w',
      true
    );
    const botAdvCp = evalWhite * botSign;
    const isBeginnerBot =
      bot.id === 'sf19-casual' ||
      bot.id === 'builtin-elo900' ||
      bot.id === 'builtin-elo500' ||
      bot.id === 'builtin-elo100';
    const minPlies = isBeginnerBot ? 4 : 8;
    const maxAcceptAdv = isBeginnerBot ? 80 : 40;
    const accepts = botAdvCp <= -100 || (ply >= minPlies && botAdvCp <= maxAcceptAdv);

    if (accepts) {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      searchTokenRef.current++;
      if (sf19ReadyRef.current && sf19WorkerRef.current) sf19WorkerRef.current.postMessage('stop');
      if (customUciReadyRef.current) sendCustomUci('stop');

      setSelectedSq(null);
      setLegalMovesForSelected([]);
      setPendingPromotion(null);
      setActiveHintMove(null);
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              gameOver: true,
              statusText: `Remis (${bot.name} Menerima)!`,
              statusType: 'gameover',
            }
          : prev
      );
      playChessSound('gameover', prefsRef.current.sound);
    } else {
      setDrawOfferedPly(ply);
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              statusText:
                ply < minPlies
                  ? `${bot.name} menolak remis (permainan baru dimulai)`
                  : `${bot.name} menolak tawaran remis`,
            }
          : prev
      );
    }
  }, [activeBotColor, activeVsBot, drawOfferedPly, sendCustomUci]);

  const handleShowHint = async () => {
    if (!gameState || !activeVsBot || gameState.gameOver || gameState.turn !== activeHumanColor) return;
    const tok = searchTokenRef.current;
    setHintBusy(true);
    let best: ChessMove | null = null;
    if (sf19ReadyRef.current && sf19WorkerRef.current) {
      best = await queryUci((c) => sf19WorkerRef.current?.postMessage(c), gameState, 650, 0, 20, tok);
    } else {
      await new Promise((r) => setTimeout(r, 60));
      best = computeBuiltinBotMove(gameState, 3);
    }
    setHintBusy(false);

    if (best && tok === searchTokenRef.current && gameStateRef.current && !gameStateRef.current.gameOver) {
      setActiveHintMove(best);
      setGameState((prev) =>
        prev ? { ...prev, statusText: `Saran: ${toAlgebraic(prev, best!, false, false)}` } : prev
      );
    }
  };

  const handleInstallWorkerCode = async (name: string, code: string, desc: string) => {
    const id = `uci-js-${Date.now()}`;
    const obj: BotProfile = {
      id,
      name,
      elo: 'Custom',
      avatarKey: 'sepram',
      kind: 'worker-code',
      code,
      desc,
      custom: true,
    };
    await dbPutEngine(obj);
    const next = [...allBots, obj];
    setAllBots(next);
    await selectBot(id, next);
  };

  const handleInstallWs = async (name: string, url: string) => {
    const id = `uci-ws-${Date.now()}`;
    const obj: BotProfile = {
      id,
      name,
      elo: 'Desktop',
      avatarKey: 'gm',
      kind: 'ws',
      url,
      desc: `Bridge (${url})`,
      custom: true,
    };
    await dbPutEngine(obj);
    const next = [...allBots, obj];
    setAllBots(next);
    await selectBot(id, next);
  };

  const handleDeleteBot = async (id: string) => {
    await dbDeleteEngine(id);
    const next = allBots.filter((b) => b.id !== id);
    setAllBots(next);
    if (activeBotId === id) {
      await selectBot('sf19-max', next);
    }
  };

  const activeBot = allBots.find((b) => b.id === activeBotId) || PRESET_BOTS[0];

  const canUndo = (() => {
    if (!gameState || history.length === 0) return false;
    if (
      activeVsBot &&
      history.length === 1 &&
      gameState.turn === activeHumanColor &&
      history[0].turn === activeBotColor
    ) {
      return false;
    }
    return true;
  })();

  return (
    <main className="min-h-screen w-full">
      {screen === 'menu' && (
        <MenuScreen
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          allBots={allBots}
          activeBotId={activeBotId}
          onSelectBot={(id) => void selectBot(id)}
          engineStatusText={engineStatusText}
          engineStatusTone={engineStatusTone}
          selectedColorPref={selectedColorPref}
          onSelectColorPref={setSelectedColorPref}
          timeControl={timeControl}
          onChangeTimeControl={setTimeControl}
          onStartGame={startNewGame}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {screen === 'game' && gameState && (
        <GameScreen
          state={gameState}
          gameEpoch={gameEpoch}
          prefs={prefs}
          activeVsBot={activeVsBot}
          activeHumanColor={activeHumanColor}
          activeBotColor={activeBotColor}
          activeBot={activeBot}
          flipped={flipped}
          selectedSq={selectedSq}
          legalMovesForSelected={legalMovesForSelected}
          activeHintMove={activeHintMove}
          lastMoveAnim={lastMoveAnim}
          canUndo={canUndo}
          canOfferDraw={!gameState.gameOver && !(activeVsBot && drawOfferedPly === gameState.uciMoves.length)}
          hintBusy={hintBusy}
          onBackMenu={handleBackMenu}
          onOpenSettings={() => setSettingsOpen(true)}
          onSquareClick={handleSquareClick}
          onDragDropMove={handleDragDropMove}
          onShowHint={() => void handleShowHint()}
          onUndo={handleUndo}
          onFlip={() => setFlipped((f) => !f)}
          onRestart={startNewGame}
          onOfferDraw={handleOfferDraw}
          onResign={handleResign}
        />
      )}

      <SettingsModal
        open={settingsOpen}
        prefs={prefs}
        activeBotName={activeBot?.name}
        onUpdatePrefs={updatePrefs}
        onOpenInstaller={() => {
          setSettingsOpen(false);
          setInstallerOpen(true);
        }}
        onClose={() => setSettingsOpen(false)}
      />

      <PromoModal
        moves={pendingPromotion}
        turn={gameState?.turn || 'w'}
        onSelect={(move) => {
          setPendingPromotion(null);
          executeMove(move, false);
        }}
      />

      <InstallerModal
        open={installerOpen}
        allBots={allBots}
        activeBotId={activeBotId}
        uciLogs={uciLogs}
        onClose={() => setInstallerOpen(false)}
        onSelectBot={(id) => void selectBot(id)}
        onDeleteBot={(id) => void handleDeleteBot(id)}
        onInstallWorkerCode={handleInstallWorkerCode}
        onInstallWs={handleInstallWs}
        onLog={logUci}
      />
    </main>
  );
}
