export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPiece {
  id?: string;
  type: PieceType;
  color: PieceColor;
}

export type BoardGrid = (ChessPiece | null)[][];

export interface SquareCoord {
  r: number;
  c: number;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export interface ChessMove {
  fr: number;
  fc: number;
  tr: number;
  tc: number;
  promo?: PieceType;
  capture?: boolean;
  doublePush?: boolean;
  enPassant?: boolean;
  castling?: 'K' | 'Q';
}

export type MoveQualityKind =
  | 'book'
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface MoveQuality {
  kind: MoveQualityKind;
  sym: string;
  label: string;
  cls:
    | 'q-book'
    | 'q-brilliant'
    | 'q-great'
    | 'q-best'
    | 'q-excellent'
    | 'q-good'
    | 'q-inaccuracy'
    | 'q-mistake'
    | 'q-blunder';
  short: string;
}

export interface OpeningInfo {
  eco: string;
  name: string;
  moves: string;
}

export interface TimersState {
  w: number;
  b: number;
  inc: number;
  unlimited: boolean;
}

export type StatusType = 'normal' | 'check' | 'gameover';

export interface GameState {
  board: BoardGrid;
  turn: PieceColor;
  castling: CastlingRights;
  enPassant: SquareCoord | null;
  captured: {
    w: ChessPiece[];
    b: ChessPiece[];
  };
  lastMove: { fr: number; fc: number; tr: number; tc: number } | null;
  moveNotations: string[];
  moveQualities: (MoveQuality | null)[];
  uciMoves: string[];
  gameOver: boolean;
  statusText: string;
  statusType: StatusType;
  timers: TimersState;
  openingName: string;
  openingEco?: string;
}

export type BoardThemeId = 'green' | 'navy' | 'sky' | 'wood' | 'bw';
export type PieceStyleId = 'modern' | 'classic' | '3d';

export interface UserPreferences {
  theme: BoardThemeId;
  pieceStyle: PieceStyleId;
  sound: boolean;
  analysis: boolean;
  coords: boolean;
}

export type GameMode = 'bot' | 'pvp';
export type ColorPreference = 'w' | 'b' | 'r';

export type BotKind = 'sf19' | 'builtin' | 'worker-code' | 'ws';

export interface BotProfile {
  id: string;
  name: string;
  elo: string;
  avatarKey: 'sf19' | 'gm' | 'aggro' | 'club' | 'casual' | 'sepram' | 'elo900' | 'elo500' | 'elo100';
  kind: BotKind;
  skill?: number;
  limitElo?: number;
  movetime?: number;
  desc: string;
  custom?: boolean;
  code?: string;
  url?: string;
}
