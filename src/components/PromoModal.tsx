import React from 'react';
import type { ChessMove, PieceColor, PieceType } from '../types/chess';
import { ChessPieceIcon } from './ChessSvgs';

interface PromoModalProps {
  moves: ChessMove[] | null;
  turn: PieceColor;
  onSelect: (move: ChessMove) => void;
}

export const PromoModal: React.FC<PromoModalProps> = ({ moves, turn, onSelect }) => {
  if (!moves || moves.length === 0) return null;

  const promoOrder: PieceType[] = ['q', 'r', 'b', 'n'];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-[320px] bg-gradient-to-b from-[#272f22] to-[#1d2219] rounded-[18px] border border-[#495641] p-5 shadow-[0_24px_54px_rgba(0,0,0,0.7)] text-center flex flex-col gap-4">
        <h3 className="text-base font-bold text-[#eeeed2]">Pilih Promosi Pion</h3>
        <div className="flex gap-2.5 justify-center">
          {promoOrder.map((tp) => {
            const m = moves.find((x) => x.promo === tp);
            if (!m) return null;
            return (
              <button
                key={tp}
                type="button"
                onClick={() => onSelect(m)}
                aria-label={`Promosi ke ${tp}`}
                className="w-[62px] h-[62px] bg-[#eeeed2] hover:bg-[#f8f8e6] rounded-xl p-2 border-2 border-[#81b64c] cursor-pointer transition-transform active:scale-95"
              >
                <ChessPieceIcon pieceKey={turn + tp} className="w-full h-full" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
