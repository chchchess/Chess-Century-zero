import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BOARD_THEMES } from '../data/assets';
import { findKing, getOpeningTheoryProgress, isKingInCheck, MATERIAL_VAL } from '../engine/chessRules';
import type {
  BotProfile,
  ChessMove,
  ChessPiece,
  GameState,
  PieceColor,
  SquareCoord,
  UserPreferences,
} from '../types/chess';
import { BotAvatarIcon, ChessPieceIcon, MoveQualityIcon } from './ChessSvgs';

interface GameScreenProps {
  state: GameState;
  gameEpoch: number;
  prefs: UserPreferences;
  activeVsBot: boolean;
  activeHumanColor: PieceColor;
  activeBotColor: PieceColor;
  activeBot: BotProfile;
  flipped: boolean;
  selectedSq: SquareCoord | null;
  legalMovesForSelected: ChessMove[];
  activeHintMove: ChessMove | null;
  lastMoveAnim: {
    fr: number;
    fc: number;
    tr: number;
    tc: number;
    castling?: 'K' | 'Q';
    skip: boolean;
  } | null;
  canUndo: boolean;
  canOfferDraw: boolean;
  hintBusy: boolean;
  onBackMenu: () => void;
  onOpenSettings: () => void;
  onSquareClick: (r: number, c: number) => void;
  onDragDropMove: (fr: number, fc: number, tr: number, tc: number) => void;
  onShowHint: () => void;
  onUndo: () => void;
  onFlip: () => void;
  onRestart: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
}

interface DragState {
  r: number;
  c: number;
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  dragging: boolean;
  piece: ChessPiece;
  squareSize: number;
}

const FILES = 'abcdefgh';
const RANKS = '87654321';

function formatTime(sec: number, unlimited: boolean): string {
  if (unlimited) return '∞';
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

interface FadingCapture {
  key: string;
  piece: ChessPiece;
  r: number;
  c: number;
}

const FadingCapturedPiece: React.FC<{
  piece: ChessPiece;
  vr: number;
  vc: number;
  onDone: () => void;
}> = ({ piece, vr, vc, onDone }) => {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || typeof el.animate !== 'function') {
      const id = window.setTimeout(() => onDoneRef.current(), 160);
      return () => clearTimeout(id);
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      onDoneRef.current();
      return;
    }

    const anim = el.animate(
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0.92, transform: 'scale(0.96)', offset: 0.35 },
        { opacity: 0, transform: 'scale(0.82)' },
      ],
      {
        duration: 185,
        easing: 'cubic-bezier(0.42, 0, 0.18, 1)',
        fill: 'forwards',
      }
    );
    anim.onfinish = () => onDoneRef.current();
    return () => {
      anim.cancel();
    };
  }, []);

  return (
    <div
      style={{
        transform: `translate3d(${vc * 100}%, ${vr * 100}%, 0)`,
      }}
      className="absolute top-0 left-0 w-[12.5%] h-[12.5%] z-[2] flex items-center justify-center pointer-events-none"
    >
      <div ref={innerRef} className="w-[96%] h-[96%] flex items-center justify-center">
        <ChessPieceIcon pieceKey={piece.color + piece.type} className="w-full h-full piece-svg" />
      </div>
    </div>
  );
};

interface BoardPieceProps {
  piece: ChessPiece;
  vr: number;
  vc: number;
  isMovingPiece: boolean;
  isSelected: boolean;
  isDraggingSource: boolean;
  isCheckmateKing: boolean;
  disableTransition: boolean;
  moveSeq: number;
}

const BoardPiece: React.FC<BoardPieceProps> = ({
  piece,
  vr,
  vc,
  isMovingPiece,
  isSelected,
  isDraggingSource,
  isCheckmateKing,
  disableTransition,
  moveSeq,
}) => {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const lastSeqRef = useRef<number>(moveSeq);

  useLayoutEffect(() => {
    if (lastSeqRef.current === moveSeq) return;
    lastSeqRef.current = moveSeq;

    const el = innerRef.current;
    if (!el || typeof el.animate !== 'function') return;
    if (!isMovingPiece || disableTransition || isCheckmateKing) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const anim = el.animate(
      [
        {
          transform: 'translate3d(0, 0, 0) scale(1)',
          filter: 'drop-shadow(1px 2px 1.5px rgba(0,0,0,0.18))',
        },
        {
          transform: 'translate3d(0, -3.5px, 0) scale(1.06)',
          filter: 'drop-shadow(4px 8px 6px rgba(0,0,0,0.42))',
          offset: 0.45,
        },
        {
          transform: 'translate3d(0, 0, 0) scale(1)',
          filter: 'drop-shadow(1px 2px 1.5px rgba(0,0,0,0.18))',
        },
      ],
      {
        duration: 210,
        easing: 'cubic-bezier(0.42, 0, 0.18, 1)',
      }
    );
    return () => {
      anim.cancel();
    };
  }, [moveSeq, isMovingPiece, disableTransition, isCheckmateKing]);

  return (
    <div
      style={{
        transform: `translate3d(${vc * 100}%, ${vr * 100}%, 0)`,
        ...(disableTransition ? { transition: 'none' } : undefined),
      }}
      className={`piece-slot absolute top-0 left-0 w-[12.5%] h-[12.5%] flex items-center justify-center pointer-events-none ${
        isMovingPiece ? 'z-[20]' : 'z-[10]'
      }`}
    >
      <div
        ref={innerRef}
        className={`piece-inner w-[96%] h-[96%] flex items-center justify-center ${
          isDraggingSource ? 'opacity-0' : 'opacity-100'
        } ${
          isSelected
            ? 'scale-[1.07] -translate-y-0.5 drop-shadow-[3px_6px_5px_rgba(0,0,0,0.36)]'
            : ''
        } ${isCheckmateKing ? 'animate-king-topple' : ''}`}
      >
        <ChessPieceIcon pieceKey={piece.color + piece.type} className="w-full h-full piece-svg" />
      </div>
    </div>
  );
};

export const GameScreen: React.FC<GameScreenProps> = ({
  state,
  gameEpoch,
  prefs,
  activeVsBot,
  activeHumanColor,
  activeBotColor,
  activeBot,
  flipped,
  selectedSq,
  legalMovesForSelected,
  activeHintMove,
  lastMoveAnim,
  canUndo,
  canOfferDraw,
  hintBusy,
  onBackMenu,
  onOpenSettings,
  onSquareClick,
  onDragDropMove,
  onShowHint,
  onUndo,
  onFlip,
  onRestart,
  onOfferDraw,
  onResign,
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const historyBoxRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = dragState;
  const suppressNextClickRef = useRef(false);

  const [renderedFlipped, setRenderedFlipped] = useState(flipped);
  const [snapClearedLen, setSnapClearedLen] = useState<number | null>(null);
  const [fadingCaptures, setFadingCaptures] = useState<FadingCapture[]>([]);
  const [confirmAction, setConfirmAction] = useState<'resign' | 'draw' | null>(null);

  const prevBoardMetaRef = useRef<{
    epoch: number;
    uciLen: number;
    pieces: Map<string, { piece: ChessPiece; r: number; c: number }>;
  }>({
    epoch: gameEpoch,
    uciLen: state.uciMoves.length,
    pieces: new Map(),
  });

  useEffect(() => {
    if (flipped !== renderedFlipped) {
      const raf = requestAnimationFrame(() => setRenderedFlipped(flipped));
      return () => cancelAnimationFrame(raf);
    }
  }, [flipped, renderedFlipped]);

  useEffect(() => {
    if (lastMoveAnim?.skip && snapClearedLen !== state.uciMoves.length) {
      const len = state.uciMoves.length;
      const raf = requestAnimationFrame(() => setSnapClearedLen(len));
      return () => cancelAnimationFrame(raf);
    }
  }, [lastMoveAnim, snapClearedLen, state.uciMoves.length]);

  useLayoutEffect(() => {
    const currentPieces = new Map<string, { piece: ChessPiece; r: number; c: number }>();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (piece) {
          const id = piece.id || `${piece.color}-${piece.type}-${r}-${c}`;
          currentPieces.set(id, { piece, r, c });
        }
      }
    }

    const prev = prevBoardMetaRef.current;
    if (prev.epoch !== gameEpoch) {
      setFadingCaptures([]);
    } else if (state.uciMoves.length > prev.uciLen && !lastMoveAnim?.skip) {
      const newlyCaptured: FadingCapture[] = [];
      prev.pieces.forEach((entry, id) => {
        if (!currentPieces.has(id)) {
          newlyCaptured.push({
            key: `${gameEpoch}-${state.uciMoves.length}-${id}`,
            piece: entry.piece,
            r: entry.r,
            c: entry.c,
          });
        }
      });
      if (newlyCaptured.length > 0) {
        setFadingCaptures((existing) => [...existing.slice(-4), ...newlyCaptured]);
      }
    }

    prevBoardMetaRef.current = {
      epoch: gameEpoch,
      uciLen: state.uciMoves.length,
      pieces: currentPieces,
    };
  }, [state.board, state.uciMoves.length, gameEpoch, lastMoveAnim?.skip]);

  useEffect(() => {
    if (historyBoxRef.current) {
      historyBoxRef.current.scrollTop = historyBoxRef.current.scrollHeight;
    }
  }, [state.moveNotations.length]);

  useEffect(() => {
    setConfirmAction(null);
  }, [gameEpoch, state.gameOver, state.uciMoves.length]);

  const getSquareFromCoords = (cx: number, cy: number): SquareCoord | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return null;
    const vc = Math.floor(((cx - rect.left) / rect.width) * 8);
    const vr = Math.floor(((cy - rect.top) / rect.height) * 8);
    if (vc < 0 || vc > 7 || vr < 0 || vr > 7) return null;
    return {
      r: flipped ? 7 - vr : vr,
      c: flipped ? 7 - vc : vc,
    };
  };

  const isDragActive = dragState !== null;

  useEffect(() => {
    if (!isDragActive) return;

    const handleMove = (e: PointerEvent) => {
      setDragState((prev) => {
        if (!prev) return null;
        const dist = Math.hypot(e.clientX - prev.startX, e.clientY - prev.startY);
        const nowDragging = prev.dragging || dist > 8;
        return {
          ...prev,
          curX: e.clientX,
          curY: e.clientY,
          dragging: nowDragging,
        };
      });
    };

    const handleUp = (e: PointerEvent) => {
      const prev = dragRef.current;
      setDragState(null);
      if (prev?.dragging) {
        suppressNextClickRef.current = true;
        const target = getSquareFromCoords(e.clientX, e.clientY);
        if (target && (target.r !== prev.r || target.c !== prev.c)) {
          onDragDropMove(prev.r, prev.c, target.r, target.c);
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isDragActive, flipped, onDragDropMove]);

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (state.gameOver) return;
    if (activeVsBot && state.turn === activeBotColor) return;
    const sq = getSquareFromCoords(e.clientX, e.clientY);
    if (!sq) return;
    const p = state.board[sq.r][sq.c];
    if (p && p.color === state.turn && boardRef.current) {
      const squareSize = boardRef.current.getBoundingClientRect().width / 8;
      setDragState({
        r: sq.r,
        c: sq.c,
        startX: e.clientX,
        startY: e.clientY,
        curX: e.clientX,
        curY: e.clientY,
        dragging: false,
        piece: p,
        squareSize,
      });
    }
  };

  const theme = BOARD_THEMES[prefs.theme] || BOARD_THEMES.green;
  const dragHoverSq = dragState?.dragging
    ? getSquareFromCoords(dragState.curX, dragState.curY)
    : null;
  const inCheck = isKingInCheck(state.board, state.turn);
  const isCheckmate = state.gameOver && inCheck;
  const kingPos = inCheck ? findKing(state.board, state.turn) : null;
  const winnerKingPos = isCheckmate
    ? findKing(state.board, state.turn === 'w' ? 'b' : 'w')
    : null;
  const lastQuality = state.moveQualities[state.moveQualities.length - 1];
  const theoryProgress = useMemo(
    () => getOpeningTheoryProgress(state.uciMoves, state.moveNotations),
    [state.uciMoves, state.moveNotations]
  );
  const openingInfo = theoryProgress.info;
  const isLastMoveBook = theoryProgress.inTheory;
  const openingEco = state.openingEco || openingInfo.eco;
  const openingTitle = openingInfo.name || state.openingName || 'Posisi Awal';
  const theoryPercent =
    theoryProgress.theoryPlies > 0
      ? Math.min(
          100,
          Math.round(
            (theoryProgress.theoryPlies / Math.max(1, theoryProgress.maxBranchPlies)) * 100
          )
        )
      : 0;

  const boardPieces = useMemo(() => {
    const list: { id: string; piece: ChessPiece; r: number; c: number }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = state.board[r][c];
        if (piece) {
          list.push({
            id: piece.id || `${piece.color}-${piece.type}-${r}-${c}`,
            piece,
            r,
            c,
          });
        }
      }
    }
    list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return list;
  }, [state.board]);

  const topColor: PieceColor = flipped ? 'w' : 'b';
  const bottomColor: PieceColor = flipped ? 'b' : 'w';

  const getPlayerLabel = (c: PieceColor) => {
    const base = c === 'w' ? 'Putih' : 'Hitam';
    if (!activeVsBot) return base;
    return c === activeBotColor ? `${activeBot.name} (${activeBot.elo})` : `${base} (Anda)`;
  };

  const renderCaptured = (c: PieceColor) => {
    const opp: PieceColor = c === 'w' ? 'b' : 'w';
    const order: Record<string, number> = { q: 1, r: 2, b: 3, n: 4, p: 5 };
    const list = [...state.captured[c]].sort((a, b) => order[a.type] - order[b.type]);
    const myMat = state.captured[c].reduce((acc, p) => acc + MATERIAL_VAL[p.type], 0);
    const oppMat = state.captured[opp].reduce((acc, p) => acc + MATERIAL_VAL[p.type], 0);
    const diff = myMat - oppMat;

    return (
      <div className="flex items-center gap-0.5 min-h-[16px] flex-wrap">
        {list.map((p, idx) => (
          <ChessPieceIcon
            key={`${p.color}${p.type}-${idx}`}
            pieceKey={p.color + p.type}
            className="w-3.5 h-3.5"
          />
        ))}
        {diff > 0 && (
          <span className="text-[11px] font-extrabold text-[#81b64c] ml-1 tabular-nums">
            +{diff}
          </span>
        )}
      </div>
    );
  };

  const renderPlayerBar = (c: PieceColor) => {
    const isTurn = !state.gameOver && state.turn === c;
    const isLow = !state.timers.unlimited && state.timers[c] <= 15 && state.timers[c] > 0;
    const isBot = activeVsBot && c === activeBotColor;

    return (
      <div
        className={`flex justify-between items-center bg-[#1f251c] px-3 py-2 rounded-xl border-2 transition-colors ${
          isTurn ? 'border-[#81b64c] shadow-[0_0_12px_rgba(129,182,76,0.18)]' : 'border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-[38px] h-[38px] rounded-[10px] overflow-hidden flex items-center justify-center shrink-0 ${
              isBot
                ? ''
                : c === 'w'
                  ? 'bg-[#f4f4ec] border border-[#ccc] p-0.5'
                  : 'bg-[#171b14] border border-[#454f3f] p-0.5'
            }`}
          >
            {isBot ? (
              <BotAvatarIcon avatarKey={activeBot.avatarKey} className="w-full h-full" />
            ) : (
              <ChessPieceIcon pieceKey={c + 'k'} className="w-full h-full" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[13.5px] text-[#f3f2e8] truncate max-w-[200px]">
              {getPlayerLabel(c)}
            </div>
            {renderCaptured(c)}
          </div>
        </div>

        <div
          className={`font-mono-tabular text-[17px] font-bold px-3 py-1.5 rounded-[9px] min-w-[78px] text-center border ${
            isLow
              ? 'bg-[#d9534f] text-white border-[#ff9a9a]'
              : isTurn
                ? 'bg-[#eeeed2] text-[#141812] border-[#eeeed2]'
                : 'bg-[#141812] text-[#f3f2e8] border-[#3a4534]'
          }`}
        >
          {formatTime(state.timers[c], state.timers.unlimited)}
        </div>
      </div>
    );
  };

  const qualityColors: Record<string, string> = {
    'q-book': 'bg-[#a88865] text-white',
    'q-brilliant': 'bg-[#26c2a3] text-white',
    'q-great': 'bg-[#5b8bb4] text-white',
    'q-best': 'bg-[#81b64c] text-white',
    'q-excellent': 'bg-[#96bc4b] text-white',
    'q-good': 'bg-[#8aa856] text-white',
    'q-inaccuracy': 'bg-[#f7c631] text-[#1e1e1e]',
    'q-mistake': 'bg-[#e68a2e] text-white',
    'q-blunder': 'bg-[#ca3431] text-white',
  };

  const movePairs: {
    num: number;
    w?: { text: string; short?: string; cls?: string; idx: number };
    b?: { text: string; short?: string; cls?: string; idx: number };
  }[] = [];
  for (let i = 0; i < state.moveNotations.length; i += 2) {
    movePairs.push({
      num: i / 2 + 1,
      w: {
        text: state.moveNotations[i],
        short: state.moveQualities[i]?.short,
        cls: state.moveQualities[i]?.cls,
        idx: i,
      },
      b: state.moveNotations[i + 1]
        ? {
            text: state.moveNotations[i + 1],
            short: state.moveQualities[i + 1]?.short,
            cls: state.moveQualities[i + 1]?.cls,
            idx: i + 1,
          }
        : undefined,
    });
  }

  return (
    <div className="min-h-screen w-full flex items-start lg:items-center justify-center px-3 py-4 sm:px-6 sm:py-6">
      <div className="w-full max-w-[980px] flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5">
        {/* Left: Board Column */}
        <div className="w-full max-w-[540px] flex flex-col gap-2">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBackMenu}
              className="bg-[#1f251c] hover:bg-[#293125] text-[#eeeed2] border border-[#3a4534] px-3 py-2 text-[12.5px] font-bold rounded-[9px] cursor-pointer whitespace-nowrap shrink-0"
            >
              Menu
            </button>

            <div className="flex-1 min-w-0 bg-[#1f251c] border border-[#3a4534] rounded-[9px] px-3 py-2 text-[11.5px] sm:text-xs text-[#dce6cf] flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#81b64c] shrink-0" />
              <span className="truncate font-semibold">
                {activeVsBot ? `${activeBot.name} · Elo ${activeBot.elo}` : '2 Pemain Lokal'}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Pengaturan"
              className="bg-[#1f251c] hover:bg-[#293125] text-[#eeeed2] border border-[#3a4534] px-3 py-2 rounded-[9px] cursor-pointer shrink-0 flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.2.64.78 1.08 1.45 1.1H21a2 2 0 1 1 0 4h-.09c-.67.02-1.25.46-1.51 1.1z" />
              </svg>
            </button>
          </div>

          {/* Dedicated Opening Theory Progress Card */}
          <div className="bg-[#1b2018] border border-[#364130] rounded-xl px-3 py-2.5 flex flex-col gap-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.22)]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isLastMoveBook
                      ? 'text-[#cfa97e]'
                      : theoryProgress.theoryPlies > 0
                        ? 'text-[#929c8b]'
                        : 'text-[#81b64c]'
                  }`}
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {openingEco && (
                    <span className="font-mono-tabular text-[10.5px] font-extrabold px-1.5 py-0.5 rounded bg-[#a88865]/25 text-[#e6c79c] border border-[#a88865]/45 shrink-0 leading-none">
                      {openingEco}
                    </span>
                  )}
                  <span className="font-bold text-[12.5px] sm:text-[13px] text-[#f3f2e8] leading-snug break-words">
                    {openingTitle}
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap ${
                  isLastMoveBook
                    ? 'bg-[#a88865]/20 text-[#e6c79c] border-[#a88865]/45'
                    : theoryProgress.theoryPlies > 0
                      ? 'bg-[#252c22] text-[#9aa592] border-[#3d4737]'
                      : 'bg-[#222a1e] text-[#81b64c] border-[#3a4a32]'
                }`}
              >
                {isLastMoveBook
                  ? 'Teori Aktif'
                  : theoryProgress.theoryPlies > 0
                    ? 'Keluar Teori'
                    : 'Pembukaan'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] leading-tight">
              <span className="text-[#9fa998] font-mono-tabular truncate">
                {theoryProgress.theoryPlies > 0
                  ? theoryProgress.theoryMovesSan
                  : 'Mainkan langkah pembuka untuk melacak teori ECO'}
              </span>
              <span className="font-mono-tabular text-[10.5px] font-bold text-[#c9d2c1] shrink-0">
                {theoryProgress.theoryPlies > 0
                  ? isLastMoveBook
                    ? `${theoryProgress.theoryPlies}/${theoryProgress.maxBranchPlies} teori`
                    : `${theoryProgress.theoryPlies} langkah teori`
                  : '0 langkah'}
              </span>
            </div>

            <div className="w-full h-1.5 bg-[#121610] rounded-full overflow-hidden border border-[#2b3426]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isLastMoveBook
                    ? 'bg-[#c49c6e]'
                    : theoryProgress.theoryPlies > 0
                      ? 'bg-[#6f7e67]'
                      : 'bg-[#81b64c]'
                }`}
                style={{ width: `${theoryPercent}%` }}
              />
            </div>
          </div>

          {renderPlayerBar(topColor)}

          {/* Chess Board */}
          <div
            className={`board-wrapper w-full aspect-square rounded-[10px] overflow-hidden shadow-[0_14px_34px_rgba(0,0,0,0.6)] relative ${
              theme.cls
            } ${prefs.pieceStyle === '3d' ? 'board-3d' : ''}`}
          >
            <div
              ref={boardRef}
              onPointerDown={handleBoardPointerDown}
              className={`relative w-full h-full style-${prefs.pieceStyle}`}
            >
              {/* Layer 1: 64 Board Squares & Highlights */}
              <div className="grid grid-cols-8 grid-rows-8 w-full h-full relative z-[1]">
                {Array.from({ length: 64 }).map((_, idx) => {
                  const vr = Math.floor(idx / 8);
                  const vc = idx % 8;
                  const r = flipped ? 7 - vr : vr;
                  const c = flipped ? 7 - vc : vc;
                  const isLight = (r + c) % 2 === 0;
                  const p = state.board[r][c];
                  const isLastFrom =
                    !!state.lastMove && state.lastMove.fr === r && state.lastMove.fc === c;
                  const isLastTo =
                    !!state.lastMove && state.lastMove.tr === r && state.lastMove.tc === c;
                  const isLast = isLastFrom || isLastTo;
                  const isSelected = selectedSq?.r === r && selectedSq?.c === c;
                  const isDragHover = dragHoverSq?.r === r && dragHoverSq?.c === c;
                  const isHintFrom = activeHintMove && activeHintMove.fr === r && activeHintMove.fc === c;
                  const isHintTo = activeHintMove && activeHintMove.tr === r && activeHintMove.tc === c;
                  const isKingCheckSq = kingPos?.r === r && kingPos?.c === c;
                  const isLegalTarget = legalMovesForSelected.some((m) => m.tr === r && m.tc === c);

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => {
                        if (suppressNextClickRef.current) {
                          suppressNextClickRef.current = false;
                          return;
                        }
                        onSquareClick(r, c);
                      }}
                      style={{
                        backgroundColor: isLight ? theme.light : theme.dark,
                        color: isLight ? theme.dark : theme.light,
                      }}
                      className={`square relative flex items-center justify-center cursor-pointer select-none ${
                        isLight ? 'light' : 'dark'
                      }`}
                    >
                      {isKingCheckSq && !isCheckmate && (
                        <span
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'radial-gradient(circle, rgba(224,58,48,0.62) 0%, rgba(224,58,48,0.22) 62%, transparent 100%)',
                          }}
                        />
                      )}
                      {isLast && (
                        <span
                          className="absolute inset-0 pointer-events-none"
                          style={
                            isLastMoveBook
                              ? {
                                  backgroundColor: isLastTo
                                    ? 'rgba(196, 146, 78, 0.46)'
                                    : 'rgba(196, 146, 78, 0.30)',
                                  ...(isLastTo
                                    ? { boxShadow: 'inset 0 0 0 2px rgba(226, 182, 118, 0.65)' }
                                    : undefined),
                                }
                              : { backgroundColor: 'var(--hl-last)' }
                          }
                        />
                      )}
                      {isSelected && (
                        <span
                          className="absolute inset-0 pointer-events-none"
                          style={{ backgroundColor: 'var(--hl-select)' }}
                        />
                      )}
                      {isDragHover && (
                        <span className="absolute inset-0 pointer-events-none bg-white/10 ring-[3.5px] ring-inset ring-white/55 z-[2]" />
                      )}
                      {isHintFrom && (
                        <span
                          className="animate-hint-glow absolute inset-0 pointer-events-none z-[1]"
                          style={{
                            background:
                              'radial-gradient(circle, rgba(34,197,94,0.34) 0%, rgba(16,185,129,0.18) 72%, rgba(16,185,129,0.08) 100%)',
                            boxShadow:
                              'inset 0 0 14px rgba(34,197,94,0.42), inset 0 0 0 2px rgba(34,197,94,0.45)',
                          }}
                        />
                      )}
                      {isHintTo && (
                        <span
                          className="animate-hint-glow absolute inset-0 pointer-events-none z-[2] flex items-center justify-center"
                          style={{
                            backgroundColor: 'rgba(34, 197, 94, 0.16)',
                            boxShadow: 'inset 0 0 0 2px rgba(34, 197, 94, 0.52)',
                          }}
                        >
                          <span
                            className={
                              p
                                ? 'w-[92%] h-[92%] rounded-full border-[4.5px] border-[#16a34a]/90 shadow-[0_0_10px_rgba(34,197,94,0.35)]'
                                : 'w-[42%] h-[42%] rounded-full border-[3.5px] border-[#16a34a]/90 bg-[#22c55e]/20 shadow-[0_0_8px_rgba(34,197,94,0.32)]'
                            }
                          />
                        </span>
                      )}

                      {prefs.coords && vc === 0 && (
                        <span className="absolute top-[2px] left-[3px] text-[9.5px] font-bold pointer-events-none opacity-85 z-[1]">
                          {RANKS[r]}
                        </span>
                      )}
                      {prefs.coords && vr === 7 && (
                        <span className="absolute bottom-[1px] right-[3px] text-[9.5px] font-bold pointer-events-none opacity-85 z-[1]">
                          {FILES[c]}
                        </span>
                      )}

                      {isLegalTarget && !isHintTo && (
                        <div
                          className={
                            p
                              ? 'absolute w-[92%] h-[92%] rounded-full border-[4.5px] border-black/25 z-[3] pointer-events-none'
                              : 'absolute w-[28%] h-[28%] rounded-full bg-black/25 z-[3] pointer-events-none'
                          }
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Layer 2: GPU-Composited Persistent Piece Layer (CSS Transitions + WAAPI Capture Fade) */}
              <div className="absolute inset-0 pointer-events-none z-[10]">
                {fadingCaptures.map((cap) => {
                  const vr = flipped ? 7 - cap.r : cap.r;
                  const vc = flipped ? 7 - cap.c : cap.c;
                  return (
                    <FadingCapturedPiece
                      key={cap.key}
                      piece={cap.piece}
                      vr={vr}
                      vc={vc}
                      onDone={() =>
                        setFadingCaptures((prev) => prev.filter((item) => item.key !== cap.key))
                      }
                    />
                  );
                })}

                {boardPieces.map(({ id, piece, r, c }) => {
                  const vr = flipped ? 7 - r : r;
                  const vc = flipped ? 7 - c : c;
                  const isDraggingSource = Boolean(
                    dragState?.dragging && dragState.r === r && dragState.c === c
                  );
                  const isPressingSource = Boolean(
                    dragState && !dragState.dragging && dragState.r === r && dragState.c === c
                  );
                  const isSelected = (selectedSq?.r === r && selectedSq?.c === c) || isPressingSource;
                  const isKingCheckSq = kingPos?.r === r && kingPos?.c === c;

                  const isCastleRookDest =
                    !!lastMoveAnim &&
                    !!lastMoveAnim.castling &&
                    r === lastMoveAnim.tr &&
                    ((lastMoveAnim.castling === 'K' && c === 5) ||
                      (lastMoveAnim.castling === 'Q' && c === 3));

                  const isMovingPiece =
                    (!!state.lastMove && state.lastMove.tr === r && state.lastMove.tc === c) ||
                    isCastleRookDest;

                  const isFlipping = flipped !== renderedFlipped;
                  const isDragSnap =
                    !!lastMoveAnim?.skip &&
                    lastMoveAnim.tr === r &&
                    lastMoveAnim.tc === c &&
                    snapClearedLen !== state.uciMoves.length;
                  const disableTransition = isFlipping || isDragSnap;

                  return (
                    <BoardPiece
                      key={`${gameEpoch}-${id}`}
                      piece={piece}
                      vr={vr}
                      vc={vc}
                      isMovingPiece={isMovingPiece}
                      isSelected={isSelected}
                      isDraggingSource={isDraggingSource}
                      isCheckmateKing={isCheckmate && isKingCheckSq}
                      disableTransition={disableTransition}
                      moveSeq={state.uciMoves.length}
                    />
                  );
                })}
              </div>

              {/* Layer 3: Checkmate & Move Quality Badges */}
              <div className="absolute inset-0 pointer-events-none z-[25]">
                {isCheckmate && kingPos && (
                  <div
                    style={{
                      transform: `translate3d(${(flipped ? 7 - kingPos.c : kingPos.c) * 100}%, ${
                        (flipped ? 7 - kingPos.r : kingPos.r) * 100
                      }%, 0)`,
                    }}
                    className="absolute top-0 left-0 w-[12.5%] h-[12.5%]"
                  >
                    <span className="absolute top-0.5 right-0.5 w-[22px] h-[22px] rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.45)] ring-[1.5px] ring-white/95 bg-[#ca3431] text-white flex items-center justify-center font-black text-[12px] leading-none">
                      #
                    </span>
                  </div>
                )}

                {isCheckmate && winnerKingPos && (
                  <div
                    style={{
                      transform: `translate3d(${(flipped ? 7 - winnerKingPos.c : winnerKingPos.c) * 100}%, ${
                        (flipped ? 7 - winnerKingPos.r : winnerKingPos.r) * 100
                      }%, 0)`,
                    }}
                    className="absolute top-0 left-0 w-[12.5%] h-[12.5%]"
                  >
                    <span className="absolute top-0.5 right-0.5 w-[22px] h-[22px] rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.45)] ring-[1.5px] ring-white/95 bg-[#81b64c] text-white flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                        <path d="M3 18h18v2H3v-2zm1-2L2 6l6 4 4-6 4 6 6-4-2 10H4z" />
                      </svg>
                    </span>
                  </div>
                )}

                {state.lastMove &&
                  !(kingPos && kingPos.r === state.lastMove.tr && kingPos.c === state.lastMove.tc) &&
                  !(
                    winnerKingPos &&
                    winnerKingPos.r === state.lastMove.tr &&
                    winnerKingPos.c === state.lastMove.tc
                  ) &&
                  (isLastMoveBook ? (
                    <div
                      style={{
                        transform: `translate3d(${(flipped ? 7 - state.lastMove.tc : state.lastMove.tc) * 100}%, ${
                          (flipped ? 7 - state.lastMove.tr : state.lastMove.tr) * 100
                        }%, 0)`,
                      }}
                      title={openingEco ? `${openingEco} · ${openingInfo.name}` : openingInfo.name}
                      className="absolute top-0 left-0 w-[12.5%] h-[12.5%]"
                    >
                      <span className="absolute top-0.5 right-0.5 w-[22px] h-[22px] rounded-full shadow-[0_2px_7px_rgba(0,0,0,0.48)] ring-[1.5px] ring-[#f7ebd9]/95 bg-[#a88865] text-white flex items-center justify-center">
                        <MoveQualityIcon kind="book" className="w-3 h-3" />
                      </span>
                    </div>
                  ) : prefs.analysis && lastQuality && lastQuality.sym ? (
                    <div
                      style={{
                        transform: `translate3d(${(flipped ? 7 - state.lastMove.tc : state.lastMove.tc) * 100}%, ${
                          (flipped ? 7 - state.lastMove.tr : state.lastMove.tr) * 100
                        }%, 0)`,
                      }}
                      className="absolute top-0 left-0 w-[12.5%] h-[12.5%]"
                    >
                      <span
                        className={`absolute top-0.5 right-0.5 w-[21px] h-[21px] rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.45)] ring-[1.5px] ring-white/95 flex items-center justify-center ${
                          qualityColors[lastQuality.cls] || 'bg-[#81b64c] text-white'
                        }`}
                      >
                        <MoveQualityIcon kind={lastQuality.kind} className="w-3 h-3" />
                      </span>
                    </div>
                  ) : null)}
              </div>
            </div>
          </div>

          {renderPlayerBar(bottomColor)}
        </div>

        {/* Right: Side Panel */}
        <div className="w-full max-w-[540px] lg:max-w-[370px] bg-[#1f251c] rounded-[14px] p-4 border border-[#3a4534] flex flex-col gap-3">
          {/* Status Row */}
          <div
            className={`px-3 py-2.5 rounded-xl text-[13.5px] font-semibold flex items-center justify-between gap-2 border ${
              state.statusType === 'gameover'
                ? 'bg-[#3b4a33] border-[#81b64c] text-white'
                : state.statusType === 'check'
                  ? 'bg-[#362c1c] border-[#f0ad4e] text-[#ffe3b8]'
                  : 'bg-[#293125] border-[#3d4a36] text-[#f3f2e8]'
            }`}
          >
            <span>{state.statusText}</span>
            {isLastMoveBook ? (
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap inline-flex items-center gap-1.5 shadow-sm bg-[#a88865] text-white">
                <MoveQualityIcon kind="book" className="w-3 h-3 shrink-0" />
                <span>{openingEco ? `Teori · ${openingEco}` : 'Teori'}</span>
              </span>
            ) : (
              prefs.analysis &&
              lastQuality && (
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap inline-flex items-center gap-1.5 shadow-sm ${
                    qualityColors[lastQuality.cls] || 'bg-[#81b64c] text-white'
                  }`}
                >
                  <MoveQualityIcon kind={lastQuality.kind} className="w-3 h-3 shrink-0" />
                  <span>{lastQuality.label}</span>
                </span>
              )
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            {activeVsBot && (
              <button
                type="button"
                disabled={hintBusy || state.gameOver || state.turn !== activeHumanColor}
                onClick={onShowHint}
                className="flex-1 min-w-[74px] py-2.5 px-2.5 rounded-xl bg-gradient-to-br from-[#215946] to-[#188665] border border-[#2eb88f] text-white text-[12.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 shrink-0">
                  <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.3 1 2.3h6c0-1 .3-1.7 1-2.3A7 7 0 0 0 12 2z" />
                </svg>
                <span>{hintBusy ? 'Cari...' : 'Saran'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="flex-1 min-w-[70px] py-2.5 px-2.5 rounded-xl bg-[#293125] hover:bg-[#333d2e] border border-[#495641] text-[#eeeed2] text-[12.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 shrink-0">
                <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
              </svg>
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={onFlip}
              className="flex-1 min-w-[70px] py-2.5 px-2.5 rounded-xl bg-[#293125] hover:bg-[#333d2e] border border-[#495641] text-[#eeeed2] text-[12.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 shrink-0">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>Putar</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="flex-1 min-w-[70px] py-2.5 px-2.5 rounded-xl bg-[#293125] hover:bg-[#333d2e] border border-[#495641] text-[#eeeed2] text-[12.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 shrink-0">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Ulang</span>
            </button>
          </div>

          {/* Match Outcome Actions (Draw & Resign) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!canOfferDraw || state.gameOver}
              onClick={() => setConfirmAction((prev) => (prev === 'draw' ? null : 'draw'))}
              className="py-2 px-3 rounded-xl bg-[#293125] hover:bg-[#333d2e] border border-[#495641] text-[#eeeed2] text-[12.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <path d="M12 3v18M5 8h14M6 8l-3 6a3 3 0 0 0 6 0L6 8zM18 8l-3 6a3 3 0 0 0 6 0l-3-6z" />
              </svg>
              <span>Remis</span>
            </button>

            <button
              type="button"
              disabled={state.gameOver}
              onClick={() => setConfirmAction((prev) => (prev === 'resign' ? null : 'resign'))}
              className="py-2 px-3 rounded-xl bg-[#2b1f1f] hover:bg-[#3a2626] border border-[#5e3939] text-[#f3d4d4] text-[12.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              <span>Menyerah</span>
            </button>
          </div>

          {confirmAction && !state.gameOver && (
            <div className="bg-[#171c14] border border-[#495641] rounded-xl px-3 py-2.5 flex items-center justify-between gap-2.5">
              <span className="text-[12px] font-semibold text-[#eef0e4] leading-snug">
                {confirmAction === 'resign'
                  ? activeVsBot
                    ? 'Yakin ingin menyerah pada pertandingan ini?'
                    : `${state.turn === 'w' ? 'Putih' : 'Hitam'} yakin ingin menyerah?`
                  : activeVsBot
                    ? `Tawarkan hasil remis ke ${activeBot.name}?`
                    : 'Setujui pertandingan berakhir remis?'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmAction;
                    setConfirmAction(null);
                    if (action === 'resign') onResign();
                    else onOfferDraw();
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-extrabold text-white cursor-pointer whitespace-nowrap ${
                    confirmAction === 'resign'
                      ? 'bg-[#ca3431] hover:bg-[#b52c29]'
                      : 'bg-[#81b64c] hover:bg-[#71a33f]'
                  }`}
                >
                  {confirmAction === 'resign' ? 'Ya, Menyerah' : 'Ya, Remis'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#293125] hover:bg-[#343f2f] border border-[#495641] text-[11.5px] font-bold text-[#d2d7c6] cursor-pointer whitespace-nowrap"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Move History */}
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#9ea693] mb-1.5">
              Riwayat Langkah
            </div>
            <div
              ref={historyBoxRef}
              className="bg-[#161a13] rounded-xl p-2.5 h-[180px] lg:h-[260px] overflow-y-auto text-[12.5px] border border-[#353f30]"
            >
              {movePairs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#9ea693]">
                  Belum ada langkah dimainkan.
                </div>
              ) : (
                <div className="grid grid-cols-[34px_1fr_1fr] gap-x-1.5 gap-y-1 items-center font-mono-tabular">
                  {movePairs.map((row) => (
                    <React.Fragment key={row.num}>
                      <div className="text-[#9ea693] font-semibold">{row.num}.</div>
                      {(['w', 'b'] as const).map((side) => {
                        const cell = row[side];
                        if (!cell) return <div key={side} />;
                        const isLatest = cell.idx === state.moveNotations.length - 1;
                        const tagColor =
                          cell.cls === 'q-blunder'
                            ? 'text-[#ff6b6b]'
                            : cell.cls === 'q-mistake'
                              ? 'text-[#ffa94d]'
                              : cell.cls === 'q-inaccuracy'
                                ? 'text-[#ffd43b]'
                                : cell.cls === 'q-brilliant'
                                  ? 'text-[#38d9a9]'
                                  : cell.cls === 'q-book'
                                    ? 'text-[#cfa97e]'
                                    : 'text-[#74c0fc]';

                        return (
                          <div
                            key={side}
                            className={`px-1.5 py-0.5 rounded flex items-center justify-between gap-1 ${
                              isLatest ? 'bg-[#81b64c]/30 font-bold text-white' : 'text-[#e2e5d6]'
                            }`}
                          >
                            <span>{cell.text}</span>
                            {prefs.analysis && cell.short && (
                              cell.cls === 'q-book' ? (
                                <span className={`${tagColor} inline-flex items-center`} title="Langkah Teori">
                                  <MoveQualityIcon kind="book" className="w-3 h-3" />
                                </span>
                              ) : (
                                <span className={`font-extrabold text-[11px] ${tagColor}`}>
                                  {cell.short}
                                </span>
                              )
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Lifted Drag Piece */}
      {dragState?.dragging && (
        <div
          style={{
            transform: `translate3d(${dragState.curX}px, ${dragState.curY}px, 0)`,
            width: dragState.squareSize,
            height: dragState.squareSize,
          }}
          className={`fixed top-0 left-0 z-[999] pointer-events-none style-${prefs.pieceStyle}`}
        >
          <div className="w-full h-full -translate-x-1/2 -translate-y-[58%] relative flex items-center justify-center">
            <span className="absolute bottom-[6%] w-[56%] h-[16%] rounded-full bg-black/35 blur-[5px]" />
            <div className="animate-piece-lift w-[96%] h-[96%] flex items-center justify-center">
              <ChessPieceIcon pieceKey={dragState.piece.color + dragState.piece.type} className="w-full h-full piece-svg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
