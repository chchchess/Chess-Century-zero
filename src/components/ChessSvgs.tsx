import React from 'react';
import type { BotProfile } from '../types/chess';
import aggroAvatar from '../assets/images/bot_pro_aggro_1795545405806.jpg';
import casualAvatar from '../assets/images/bot_pro_rookie_1795545409272.jpg';
import clubAvatar from '../assets/images/bot_pro_club_v2_1795545442729.jpg';
import elo100Avatar from '../assets/images/bot_pro_elo100_v3_1795545474280.jpg';
import elo500Avatar from '../assets/images/bot_pro_elo500_1795545410413.jpg';
import elo900Avatar from '../assets/images/bot_pro_elo900_1795545410638.jpg';
import gmAvatar from '../assets/images/bot_pro_gm_1795545405850.jpg';
import sepramAvatar from '../assets/images/bot_pro_sepram_1795545407675.jpg';
import sf19Avatar from '../assets/images/bot_pro_sf19_1795545405419.jpg';

interface PieceIconProps {
  pieceKey: string;
  className?: string;
}

const VALID_PIECES = new Set([
  'wp', 'wr', 'wn', 'wb', 'wq', 'wk',
  'bp', 'br', 'bn', 'bb', 'bq', 'bk',
]);

const PIECE_BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

export const ChessPieceIcon: React.FC<PieceIconProps> = ({ pieceKey, className = 'w-full h-full' }) => {
  if (!VALID_PIECES.has(pieceKey)) return null;
  return (
    <img
      src={`${PIECE_BASE}pieces/neo/${pieceKey}.png`}
      alt={pieceKey}
      draggable={false}
      decoding="async"
      className={`${className} object-contain select-none pointer-events-none`}
    />
  );
};

interface BotAvatarProps {
  avatarKey: BotProfile['avatarKey'];
  className?: string;
}

const BOT_AVATAR_MAP: Record<BotProfile['avatarKey'], { src: string; alt: string }> = {
  sf19: { src: sf19Avatar, alt: 'Stockfish 19' },
  gm: { src: gmAvatar, alt: 'GM Aurelius' },
  aggro: { src: aggroAvatar, alt: 'Ignis Tactical' },
  club: { src: clubAvatar, alt: 'Ksatria Klub' },
  sepram: { src: sepramAvatar, alt: 'Mentor Klasik' },
  casual: { src: casualAvatar, alt: 'Rookie Santai' },
  elo900: { src: elo900Avatar, alt: 'Bidak Muda' },
  elo500: { src: elo500Avatar, alt: 'Kawan Belajar' },
  elo100: { src: elo100Avatar, alt: 'Si Pemula' },
};

export const BotAvatarIcon: React.FC<BotAvatarProps> = ({ avatarKey, className = 'w-full h-full' }) => {
  const entry = BOT_AVATAR_MAP[avatarKey] || BOT_AVATAR_MAP.sepram;
  return (
    <img
      src={entry.src}
      alt={entry.alt}
      referrerPolicy="no-referrer"
      draggable={false}
      decoding="async"
      className={`${className} object-cover select-none pointer-events-none`}
    />
  );
};

export const MoveQualityIcon: React.FC<{ kind: string; className?: string }> = ({
  kind,
  className = 'w-3 h-3',
}) => {
  switch (kind) {
    case 'book':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" fill="currentColor" fillOpacity="0.18" />
          <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" fill="currentColor" fillOpacity="0.18" />
        </svg>
      );
    case 'best':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9L12 2.5z" />
        </svg>
      );
    case 'excellent':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'good':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
          <path d="M6 12.5l4 4L18 8.5" />
        </svg>
      );
    case 'brilliant':
      return <span className="font-black leading-none tracking-tighter text-[10px]">!!</span>;
    case 'great':
      return <span className="font-black leading-none text-[11px]">!</span>;
    case 'inaccuracy':
      return <span className="font-black leading-none tracking-tighter text-[10px]">?!</span>;
    case 'mistake':
      return <span className="font-black leading-none text-[11px]">?</span>;
    case 'blunder':
    default:
      return <span className="font-black leading-none tracking-tighter text-[10px]">??</span>;
  }
};

