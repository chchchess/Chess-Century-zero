import { OPENING_BOOK } from '../data/assets';
import type {
  BoardGrid,
  CastlingRights,
  ChessMove,
  ChessPiece,
  GameState,
  MoveQuality,
  OpeningInfo,
  PieceColor,
  PieceType,
  SquareCoord,
} from '../types/chess';

export const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export const MATERIAL_VAL: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const PST: Record<PieceType, number[][]> = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  r: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  k: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

export function createInitialBoard(): BoardGrid {
  const b: BoardGrid = Array.from({ length: 8 }, () => Array<ChessPiece | null>(8).fill(null));
  const back: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { id: `b-back-${c}`, type: back[c], color: 'b' };
    b[1][c] = { id: `b-pawn-${c}`, type: 'p', color: 'b' };
    b[6][c] = { id: `w-pawn-${c}`, type: 'p', color: 'w' };
    b[7][c] = { id: `w-back-${c}`, type: back[c], color: 'w' };
  }
  return b;
}

export function cloneBoard(b: BoardGrid): BoardGrid {
  return b.map((r) => r.map((c) => (c ? { ...c } : null)));
}

export function cloneState(s: GameState): GameState {
  return {
    board: cloneBoard(s.board),
    turn: s.turn,
    castling: { ...s.castling },
    enPassant: s.enPassant ? { ...s.enPassant } : null,
    captured: { w: [...s.captured.w], b: [...s.captured.b] },
    lastMove: s.lastMove ? { ...s.lastMove } : null,
    moveNotations: [...s.moveNotations],
    moveQualities: [...s.moveQualities],
    uciMoves: [...s.uciMoves],
    gameOver: s.gameOver,
    statusText: s.statusText,
    statusType: s.statusType,
    timers: { ...s.timers },
    openingName: s.openingName,
  };
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function findKing(board: BoardGrid, color: PieceColor): SquareCoord | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell?.color === color && cell.type === 'k') return { r, c };
    }
  }
  return null;
}

export function isSquareAttacked(board: BoardGrid, r: number, c: number, att: PieceColor): boolean {
  const pd = att === 'w' ? 1 : -1;
  for (const dc of [-1, 1]) {
    if (inBounds(r + pd, c + dc) && board[r + pd][c + dc]?.color === att && board[r + pd][c + dc]?.type === 'p') {
      return true;
    }
  }
  for (const [dr, dc] of [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ]) {
    if (inBounds(r + dr, c + dc) && board[r + dr][c + dc]?.color === att && board[r + dr][c + dc]?.type === 'n') {
      return true;
    }
  }
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if ((dr || dc) && inBounds(r + dr, c + dc) && board[r + dr][c + dc]?.color === att && board[r + dr][c + dc]?.type === 'k') {
        return true;
      }
    }
  }
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === att && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === att && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return false;
}

export function isKingInCheck(b: BoardGrid, c: PieceColor): boolean {
  const k = findKing(b, c);
  return k ? isSquareAttacked(b, k.r, k.c, c === 'w' ? 'b' : 'w') : false;
}

interface SimPosition {
  board: BoardGrid;
  turn: PieceColor;
  castling: CastlingRights;
  enPassant: SquareCoord | null;
}

export function getPseudoMoves(s: SimPosition, r: number, c: number): ChessMove[] {
  const b = s.board;
  const piece = b[r][c];
  if (!piece) return [];
  const moves: ChessMove[] = [];
  const col = piece.color;
  const en: PieceColor = col === 'w' ? 'b' : 'w';

  if (piece.type === 'p') {
    const dir = col === 'w' ? -1 : 1;
    const sr = col === 'w' ? 6 : 1;
    const pr = col === 'w' ? 0 : 7;
    if (inBounds(r + dir, c) && !b[r + dir][c]) {
      if (r + dir === pr) {
        (['q', 'r', 'b', 'n'] as PieceType[]).forEach((promo) =>
          moves.push({ fr: r, fc: c, tr: r + dir, tc: c, promo })
        );
      } else {
        moves.push({ fr: r, fc: c, tr: r + dir, tc: c });
      }
      if (r === sr && !b[r + 2 * dir][c]) {
        moves.push({ fr: r, fc: c, tr: r + 2 * dir, tc: c, doublePush: true });
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const t = b[nr][nc];
      if (t && t.color === en) {
        if (nr === pr) {
          (['q', 'r', 'b', 'n'] as PieceType[]).forEach((promo) =>
            moves.push({ fr: r, fc: c, tr: nr, tc: nc, promo, capture: true })
          );
        } else {
          moves.push({ fr: r, fc: c, tr: nr, tc: nc, capture: true });
        }
      } else if (s.enPassant && s.enPassant.r === nr && s.enPassant.c === nc) {
        moves.push({ fr: r, fc: c, tr: nr, tc: nc, enPassant: true, capture: true });
      }
    }
  } else if (piece.type === 'n') {
    for (const [dr, dc] of [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && (!b[nr][nc] || b[nr][nc]?.color === en)) {
        moves.push({ fr: r, fc: c, tr: nr, tc: nc, capture: !!b[nr][nc] });
      }
    }
  } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
    const dirs: [number, number][] = [];
    if (piece.type !== 'r') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
    if (piece.type !== 'b') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const t = b[nr][nc];
        if (!t) {
          moves.push({ fr: r, fc: c, tr: nr, tc: nc });
        } else {
          if (t.color === en) moves.push({ fr: r, fc: c, tr: nr, tc: nc, capture: true });
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  } else if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr || dc) {
          const nr = r + dr;
          const nc = c + dc;
          if (inBounds(nr, nc) && (!b[nr][nc] || b[nr][nc]?.color === en)) {
            moves.push({ fr: r, fc: c, tr: nr, tc: nc, capture: !!b[nr][nc] });
          }
        }
      }
    }
    const hr = col === 'w' ? 7 : 0;
    if (r === hr && c === 4 && !isKingInCheck(b, col)) {
      if (
        (col === 'w' ? s.castling.wK : s.castling.bK) &&
        !b[hr][5] &&
        !b[hr][6] &&
        b[hr][7]?.type === 'r' &&
        b[hr][7]?.color === col &&
        !isSquareAttacked(b, hr, 5, en) &&
        !isSquareAttacked(b, hr, 6, en)
      ) {
        moves.push({ fr: r, fc: c, tr: hr, tc: 6, castling: 'K' });
      }
      if (
        (col === 'w' ? s.castling.wQ : s.castling.bQ) &&
        !b[hr][1] &&
        !b[hr][2] &&
        !b[hr][3] &&
        b[hr][0]?.type === 'r' &&
        b[hr][0]?.color === col &&
        !isSquareAttacked(b, hr, 3, en) &&
        !isSquareAttacked(b, hr, 2, en)
      ) {
        moves.push({ fr: r, fc: c, tr: hr, tc: 2, castling: 'Q' });
      }
    }
  }
  return moves;
}

export function applyMoveToBoard(
  s: SimPosition,
  m: ChessMove
): { nb: BoardGrid; castling: CastlingRights; enPassant: SquareCoord | null; capturedPiece: ChessPiece | null } {
  const nb = cloneBoard(s.board);
  const orig = nb[m.fr][m.fc]!;
  const p: ChessPiece = { ...orig };
  let cap = nb[m.tr][m.tc] ? { ...nb[m.tr][m.tc]! } : null;
  nb[m.fr][m.fc] = null;
  if (m.promo) p.type = m.promo;
  nb[m.tr][m.tc] = p;

  if (m.enPassant) {
    const cr = p.color === 'w' ? m.tr + 1 : m.tr - 1;
    cap = nb[cr][m.tc] ? { ...nb[cr][m.tc]! } : null;
    nb[cr][m.tc] = null;
  }
  if (m.castling === 'K') {
    nb[m.tr][5] = nb[m.tr][7];
    nb[m.tr][7] = null;
  } else if (m.castling === 'Q') {
    nb[m.tr][3] = nb[m.tr][0];
    nb[m.tr][0] = null;
  }

  const cs = { ...s.castling };
  if (p.type === 'k') {
    if (p.color === 'w') {
      cs.wK = false;
      cs.wQ = false;
    } else {
      cs.bK = false;
      cs.bQ = false;
    }
  }
  if ((m.fr === 7 && m.fc === 0) || (m.tr === 7 && m.tc === 0)) cs.wQ = false;
  if ((m.fr === 7 && m.fc === 7) || (m.tr === 7 && m.tc === 7)) cs.wK = false;
  if ((m.fr === 0 && m.fc === 0) || (m.tr === 0 && m.tc === 0)) cs.bQ = false;
  if ((m.fr === 0 && m.fc === 7) || (m.tr === 0 && m.tc === 7)) cs.bK = false;

  return {
    nb,
    castling: cs,
    enPassant: m.doublePush ? { r: (m.fr + m.tr) / 2, c: m.fc } : null,
    capturedPiece: cap,
  };
}

export function getLegalMovesForSquare(s: SimPosition, r: number, c: number): ChessMove[] {
  const p = s.board[r][c];
  if (!p || p.color !== s.turn) return [];
  return getPseudoMoves(s, r, c).filter((m) => !isKingInCheck(applyMoveToBoard(s, m).nb, p.color));
}

export function getAllLegalMoves(s: SimPosition): ChessMove[] {
  const a: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (s.board[r][c]?.color === s.turn) {
        a.push(...getLegalMovesForSquare(s, r, c));
      }
    }
  }
  return a;
}

export function moveToUci(m: ChessMove): string {
  return 'abcdefgh'[m.fc] + '87654321'[m.fr] + 'abcdefgh'[m.tc] + '87654321'[m.tr] + (m.promo || '');
}

export function uciToMove(s: SimPosition, u: string): ChessMove | null {
  if (!u || u.length < 4) return null;
  const fc = 'abcdefgh'.indexOf(u[0]);
  const fr = '87654321'.indexOf(u[1]);
  const tc = 'abcdefgh'.indexOf(u[2]);
  const tr = '87654321'.indexOf(u[3]);
  const pr = u[4] ? (u[4].toLowerCase() as PieceType) : undefined;
  if (fc < 0 || fr < 0 || tc < 0 || tr < 0) return null;
  const l = getLegalMovesForSquare(s, fr, fc);
  return l.find((m) => m.tr === tr && m.tc === tc && m.promo === pr) || l.find((m) => m.tr === tr && m.tc === tc) || null;
}

export function toAlgebraic(s: SimPosition, m: ChessMove, chk: boolean, mate: boolean): string {
  if (m.castling === 'K') return 'O-O' + (mate ? '#' : chk ? '+' : '');
  if (m.castling === 'Q') return 'O-O-O' + (mate ? '#' : chk ? '+' : '');
  const f = 'abcdefgh';
  const rk = '87654321';
  const p = s.board[m.fr][m.fc]!;
  let st = '';
  if (p.type === 'p') {
    st = (m.capture ? f[m.fc] + 'x' : '') + f[m.tc] + rk[m.tr] + (m.promo ? '=' + m.promo.toUpperCase() : '');
  } else {
    const map: Record<Exclude<PieceType, 'p'>, string> = { n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };
    let disambig = '';
    const samePieceMoves = getAllLegalMoves(s).filter(
      (o) =>
        o.tr === m.tr &&
        o.tc === m.tc &&
        (o.fr !== m.fr || o.fc !== m.fc) &&
        s.board[o.fr][o.fc]?.type === p.type
    );
    if (samePieceMoves.length > 0) {
      const sameFile = samePieceMoves.some((o) => o.fc === m.fc);
      const sameRank = samePieceMoves.some((o) => o.fr === m.fr);
      if (!sameFile) disambig = f[m.fc];
      else if (!sameRank) disambig = rk[m.fr];
      else disambig = f[m.fc] + rk[m.fr];
    }
    st = map[p.type] + disambig + (m.capture ? 'x' : '') + f[m.tc] + rk[m.tr];
  }
  return st + (mate ? '#' : chk ? '+' : '');
}

export function isInsufficientMaterial(b: BoardGrid): boolean {
  const ps: { type: PieceType; color: PieceColor; r: number; c: number }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = b[r][c];
      if (cell && cell.type !== 'k') ps.push({ ...cell, r, c });
    }
  }
  if (ps.length === 0) return true;
  if (ps.length === 1 && (ps[0].type === 'n' || ps[0].type === 'b')) return true;
  if (ps.length === 2 && ps[0].type === 'b' && ps[1].type === 'b' && ps[0].color !== ps[1].color) {
    return (ps[0].r + ps[0].c) % 2 === (ps[1].r + ps[1].c) % 2;
  }
  return false;
}

function getPositionKey(s: SimPosition): string {
  let out = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c];
      out += p ? (p.color === 'w' ? p.type.toUpperCase() : p.type) : '.';
    }
  }
  const cFlags =
    (s.castling.wK ? 'K' : '') +
    (s.castling.wQ ? 'Q' : '') +
    (s.castling.bK ? 'k' : '') +
    (s.castling.bQ ? 'q' : '');
  const ep = s.enPassant ? `${s.enPassant.r},${s.enPassant.c}` : '-';
  return `${out}|${s.turn}|${cFlags || '-'}|${ep}`;
}

function applyUciFast(sim: SimPosition, u: string): SimPosition | null {
  if (!u || u.length < 4) return null;
  const fc = 'abcdefgh'.indexOf(u[0]);
  const fr = '87654321'.indexOf(u[1]);
  const tc = 'abcdefgh'.indexOf(u[2]);
  const tr = '87654321'.indexOf(u[3]);
  const promo = u[4] ? (u[4].toLowerCase() as PieceType) : undefined;
  if (fc < 0 || fr < 0 || tc < 0 || tr < 0) return null;
  const p = sim.board[fr][fc];
  if (!p || p.color !== sim.turn) return null;
  const castling =
    p.type === 'k' && Math.abs(tc - fc) === 2 ? (tc === 6 ? 'K' : 'Q') : undefined;
  const doublePush = p.type === 'p' && Math.abs(tr - fr) === 2;
  const enPassant =
    p.type === 'p' &&
    fc !== tc &&
    !sim.board[tr][tc] &&
    sim.enPassant?.r === tr &&
    sim.enPassant?.c === tc;
  const capture = Boolean(sim.board[tr][tc]) || enPassant;
  const { nb, castling: nextC, enPassant: nextEp } = applyMoveToBoard(sim, {
    fr,
    fc,
    tr,
    tc,
    promo,
    castling,
    doublePush,
    enPassant,
    capture,
  });
  return {
    board: nb,
    turn: sim.turn === 'w' ? 'b' : 'w',
    castling: nextC,
    enPassant: nextEp,
  };
}

let cachedPosMap: Map<string, OpeningInfo> | null = null;
function getOpeningPositionMap(): Map<string, OpeningInfo> {
  if (cachedPosMap) return cachedPosMap;
  const map = new Map<string, OpeningInfo>();
  for (const [ln, eco, nm] of OPENING_BOOK) {
    let sim: SimPosition = {
      board: createInitialBoard(),
      turn: 'w',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
    };
    let ok = true;
    for (const u of ln.split(' ')) {
      const next = applyUciFast(sim, u);
      if (!next) {
        ok = false;
        break;
      }
      sim = next;
    }
    if (ok) {
      const key = getPositionKey(sim);
      if (!map.has(key)) {
        map.set(key, { eco, name: nm, moves: ln });
      }
    }
  }
  cachedPosMap = map;
  return map;
}

export function detectOpeningInfo(uciMoves: string[]): OpeningInfo {
  if (uciMoves.length === 0) return { eco: '', name: 'Posisi Awal', moves: '' };
  const seq = uciMoves.join(' ');
  let match: OpeningInfo = { eco: '', name: 'Posisi Awal', moves: '' };
  let bestPlies = 0;

  for (const [ln, eco, nm] of OPENING_BOOK) {
    if (seq === ln || seq.startsWith(ln + ' ')) {
      const plies = ln.split(' ').length;
      if (plies > bestPlies) {
        bestPlies = plies;
        match = { eco, name: nm, moves: ln };
      }
    }
  }

  // Also resolve transpositions by replaying up to 18 plies and checking board positions
  const posMap = getOpeningPositionMap();
  let sim: SimPosition = {
    board: createInitialBoard(),
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
  };
  const maxScan = Math.min(uciMoves.length, 18);
  for (let i = 0; i < maxScan; i++) {
    const next = applyUciFast(sim, uciMoves[i]);
    if (!next) break;
    sim = next;
    const ply = i + 1;
    if (ply >= bestPlies) {
      const hit = posMap.get(getPositionKey(sim));
      if (hit && (ply > bestPlies || match.eco === '')) {
        bestPlies = ply;
        match = hit;
      }
    }
  }

  return match;
}

export function detectOpening(uciMoves: string[]): string {
  return detectOpeningInfo(uciMoves).name;
}

export function evaluateBoard(b: BoardGrid): number {
  let sc = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p) continue;
      sc += (PIECE_VALUES[p.type] + PST[p.type][p.color === 'w' ? r : 7 - r][c]) * (p.color === 'w' ? 1 : -1);
    }
  }
  return sc;
}

export function orderMoves(ms: ChessMove[], b: BoardGrid): ChessMove[] {
  return ms.sort((a, z) => {
    let sa = 0;
    let sb = 0;
    if (a.capture) {
      sa += 10 * (b[a.tr][a.tc] ? PIECE_VALUES[b[a.tr][a.tc]!.type] : 100) - PIECE_VALUES[b[a.fr][a.fc]!.type];
    }
    if (z.capture) {
      sb += 10 * (b[z.tr][z.tc] ? PIECE_VALUES[b[z.tr][z.tc]!.type] : 100) - PIECE_VALUES[b[z.fr][z.fc]!.type];
    }
    if (a.promo === 'q') sa += 900;
    if (z.promo === 'q') sb += 900;
    return sb - sa;
  });
}

function quiescence(sim: SimPosition, al: number, be: number, maxing: boolean, qDepth: number): number {
  const standPat = evaluateBoard(sim.board);
  if (qDepth <= 0) return standPat;

  if (maxing) {
    if (standPat >= be) return be;
    if (standPat > al) al = standPat;
    const caps = orderMoves(
      getAllLegalMoves(sim).filter((m) => m.capture || m.promo === 'q'),
      sim.board
    );
    for (const m of caps) {
      const { nb, castling, enPassant } = applyMoveToBoard(sim, m);
      const score = quiescence({ board: nb, turn: 'b', castling, enPassant }, al, be, false, qDepth - 1);
      if (score >= be) return be;
      if (score > al) al = score;
    }
    return al;
  } else {
    if (standPat <= al) return al;
    if (standPat < be) be = standPat;
    const caps = orderMoves(
      getAllLegalMoves(sim).filter((m) => m.capture || m.promo === 'q'),
      sim.board
    );
    for (const m of caps) {
      const { nb, castling, enPassant } = applyMoveToBoard(sim, m);
      const score = quiescence({ board: nb, turn: 'w', castling, enPassant }, al, be, true, qDepth - 1);
      if (score <= al) return al;
      if (score < be) be = score;
    }
    return be;
  }
}

export function minimax(sim: SimPosition, depth: number, al: number, be: number, maxing: boolean, useQuiescence = false): number {
  const ms = getAllLegalMoves(sim);
  if (ms.length === 0) {
    return isKingInCheck(sim.board, sim.turn) ? (maxing ? -100000 - depth : 100000 + depth) : 0;
  }
  if (depth === 0) {
    return useQuiescence ? quiescence(sim, al, be, maxing, 2) : evaluateBoard(sim.board);
  }
  orderMoves(ms, sim.board);

  if (maxing) {
    let best = -Infinity;
    for (const m of ms) {
      const { nb, castling, enPassant } = applyMoveToBoard(sim, m);
      const ev = minimax({ board: nb, turn: 'b', castling, enPassant }, depth - 1, al, be, false, useQuiescence);
      if (ev > best) best = ev;
      if (ev > al) al = ev;
      if (be <= al) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of ms) {
      const { nb, castling, enPassant } = applyMoveToBoard(sim, m);
      const ev = minimax({ board: nb, turn: 'w', castling, enPassant }, depth - 1, al, be, true, useQuiescence);
      if (ev < best) best = ev;
      if (ev < be) be = ev;
      if (be <= al) break;
    }
    return best;
  }
}

export function isBookSequence(uciMoves: string[]): boolean {
  if (uciMoves.length === 0) return false;
  const seq = uciMoves.join(' ');
  for (const [ln] of OPENING_BOOK) {
    if (ln === seq || ln.startsWith(seq + ' ')) {
      return true;
    }
  }
  if (uciMoves.length <= 16) {
    const posMap = getOpeningPositionMap();
    let sim: SimPosition = {
      board: createInitialBoard(),
      turn: 'w',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
    };
    for (const u of uciMoves) {
      const next = applyUciFast(sim, u);
      if (!next) return false;
      sim = next;
    }
    return posMap.has(getPositionKey(sim));
  }
  return false;
}

export interface OpeningTheoryProgress {
  info: OpeningInfo;
  inTheory: boolean;
  theoryPlies: number;
  maxBranchPlies: number;
  theoryMovesSan: string;
}

export function getOpeningTheoryProgress(
  uciMoves: string[],
  moveNotations: string[]
): OpeningTheoryProgress {
  const info = detectOpeningInfo(uciMoves);
  if (uciMoves.length === 0) {
    return {
      info,
      inTheory: false,
      theoryPlies: 0,
      maxBranchPlies: 0,
      theoryMovesSan: '',
    };
  }

  let theoryPlies = 0;
  const maxCheck = Math.min(uciMoves.length, 18);
  for (let k = 1; k <= maxCheck; k++) {
    if (isBookSequence(uciMoves.slice(0, k))) {
      theoryPlies = k;
    } else if (theoryPlies > 0) {
      break;
    }
  }

  const inTheory = theoryPlies === uciMoves.length;
  let maxBranchPlies = theoryPlies;
  if (inTheory) {
    const seq = uciMoves.join(' ');
    for (const [ln] of OPENING_BOOK) {
      if (ln === seq || ln.startsWith(seq + ' ')) {
        const plies = ln.split(' ').length;
        if (plies > maxBranchPlies) maxBranchPlies = plies;
      }
    }
    if (info.moves) {
      for (const [ln] of OPENING_BOOK) {
        if (ln === info.moves || ln.startsWith(info.moves + ' ')) {
          const plies = ln.split(' ').length;
          if (plies > maxBranchPlies) maxBranchPlies = plies;
        }
      }
    }
  }

  const parts: string[] = [];
  for (let i = 0; i < theoryPlies; i += 2) {
    const moveNum = i / 2 + 1;
    const wMove = moveNotations[i] || uciMoves[i];
    const bMove = i + 1 < theoryPlies ? moveNotations[i + 1] || uciMoves[i + 1] : '';
    parts.push(bMove ? `${moveNum}. ${wMove} ${bMove}` : `${moveNum}. ${wMove}`);
  }

  return {
    info,
    inTheory,
    theoryPlies,
    maxBranchPlies: Math.max(maxBranchPlies, theoryPlies),
    theoryMovesSan: parts.join(' '),
  };
}

function cpToWinProb(cp: number): number {
  const clamped = Math.max(-2000, Math.min(2000, cp));
  return 1 / (1 + Math.exp(-0.00368208 * clamped));
}

export function analyzeMoveQuality(
  prev: GameState,
  mv: ChessMove,
  nb: BoardGrid,
  enabled: boolean,
  fromStrongEngine = false
): MoveQuality | null {
  if (!enabled) return null;

  const key = moveToUci(mv);
  const nextSeq = [...prev.uciMoves, key];
  if (isBookSequence(nextSeq)) {
    const info = detectOpeningInfo(nextSeq);
    return {
      kind: 'book',
      sym: 'book',
      label: info.eco ? `Teori · ${info.eco}` : 'Teori',
      cls: 'q-book',
      short: 'book',
    };
  }

  const col = prev.turn;
  const sign = col === 'w' ? 1 : -1;
  const all = orderMoves(getAllLegalMoves(prev), prev.board);
  if (all.length <= 1) {
    return { kind: 'best', sym: '★', label: 'Best', cls: 'q-best', short: '' };
  }

  let b1 = -Infinity;
  let b2 = -Infinity;
  let ps = -Infinity;

  for (const m of all) {
    const { nb: cb, castling, enPassant } = applyMoveToBoard(prev, m);
    const sc =
      minimax(
        { board: cb, turn: col === 'w' ? 'b' : 'w', castling, enPassant },
        1,
        -Infinity,
        Infinity,
        col !== 'w',
        true
      ) * sign;
    if (sc > b1) {
      b2 = b1;
      b1 = sc;
    } else if (sc > b2) {
      b2 = sc;
    }
    if (moveToUci(m) === key) ps = sc;
  }

  const winBest = cpToWinProb(b1);
  const winSecond = b2 === -Infinity ? 0 : cpToWinProb(b2);
  const winPlayed = cpToWinProb(ps);
  const winLoss = Math.max(0, winBest - winPlayed);
  const cpLoss = Math.max(0, b1 - ps);

  const mp = prev.board[mv.fr][mv.fc];
  const en: PieceColor = col === 'w' ? 'b' : 'w';
  const sac =
    !!mp &&
    PIECE_VALUES[mp.type] >= 300 &&
    isSquareAttacked(nb, mv.tr, mv.tc, en) &&
    !mv.capture;

  // Strong UCI/Stockfish 19 moves are calibrated against Stockfish evaluation standards
  if (fromStrongEngine) {
    if (sac && ps >= -45) {
      return { kind: 'brilliant', sym: '!!', label: 'Brilliant !!', cls: 'q-brilliant', short: '!!' };
    }
    if (winBest - winSecond >= 0.14 && winLoss <= 0.03) {
      return { kind: 'great', sym: '!', label: 'Great !', cls: 'q-great', short: '!' };
    }
    if (winLoss <= 0.03 || cpLoss <= 30) {
      return { kind: 'best', sym: '★', label: 'Best', cls: 'q-best', short: '' };
    }
    return { kind: 'excellent', sym: '✓', label: 'Excellent', cls: 'q-excellent', short: '' };
  }

  if (winLoss <= 0.022 && sac && ps >= -35) {
    return { kind: 'brilliant', sym: '!!', label: 'Brilliant !!', cls: 'q-brilliant', short: '!!' };
  }
  if (winLoss <= 0.015 && winBest - winSecond >= 0.14) {
    return { kind: 'great', sym: '!', label: 'Great !', cls: 'q-great', short: '!' };
  }
  if (winLoss <= 0.015 || cpLoss <= 15) {
    return { kind: 'best', sym: '★', label: 'Best', cls: 'q-best', short: '' };
  }
  if (winLoss <= 0.038 || cpLoss <= 38) {
    return { kind: 'excellent', sym: '✓', label: 'Excellent', cls: 'q-excellent', short: '' };
  }
  if (winLoss <= 0.075 || cpLoss <= 75) {
    return { kind: 'good', sym: '', label: 'Good', cls: 'q-good', short: '' };
  }
  if (winLoss <= 0.13 || cpLoss <= 140) {
    return { kind: 'inaccuracy', sym: '?!', label: 'Inaccuracy ?!', cls: 'q-inaccuracy', short: '?!' };
  }
  if (winLoss <= 0.23 || cpLoss <= 280) {
    return { kind: 'mistake', sym: '?', label: 'Mistake ?', cls: 'q-mistake', short: '?' };
  }
  return { kind: 'blunder', sym: '??', label: 'Blunder ??', cls: 'q-blunder', short: '??' };
}

export function computeBuiltinBotMove(s: GameState, depth = 2, casualBlunderChance = 0): ChessMove | null {
  const bc = s.turn;
  const maxing = bc === 'w';
  const ms = orderMoves(getAllLegalMoves(s), s.board);
  if (!ms.length) return null;

  // Check opening book for quick natural replies when playing stronger built-in modes
  if (casualBlunderChance < 0.3 && s.uciMoves.length < 6) {
    const prefix = s.uciMoves.join(' ');
    const candidates: string[] = [];
    for (const [line] of OPENING_BOOK) {
      const tokens = line.split(' ');
      if (tokens.length === s.uciMoves.length + 1 && (prefix === '' || line.startsWith(prefix + ' '))) {
        candidates.push(tokens[tokens.length - 1]);
      }
    }
    if (candidates.length > 0) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const bookMove = uciToMove(s, pick);
      if (bookMove) return bookMove;
    }
  }

  const scored: { move: ChessMove; val: number }[] = [];
  for (const m of ms) {
    const { nb, castling, enPassant } = applyMoveToBoard(s, m);
    const val = minimax(
      { board: nb, turn: bc === 'w' ? 'b' : 'w', castling, enPassant },
      Math.max(0, depth - 1),
      -Infinity,
      Infinity,
      !maxing,
      depth >= 3
    );
    scored.push({ move: m, val });
  }

  scored.sort((a, b) => (maxing ? b.val - a.val : a.val - b.val));

  if (casualBlunderChance > 0 && scored.length > 1 && Math.random() < casualBlunderChance) {
    if (casualBlunderChance >= 0.7) {
      // Elo 100: mostly picks any legal move randomly
      return scored[Math.floor(Math.random() * scored.length)].move;
    }
    const ratio = casualBlunderChance >= 0.5 ? 0.7 : 0.35;
    const poolSize = Math.max(2, Math.min(scored.length, Math.ceil(scored.length * ratio)));
    return scored[Math.floor(Math.random() * poolSize)].move;
  }

  const bestVal = scored[0].val;
  const bests = scored.filter((x) => x.val === bestVal).map((x) => x.move);
  return bests[Math.floor(Math.random() * bests.length)];
}
