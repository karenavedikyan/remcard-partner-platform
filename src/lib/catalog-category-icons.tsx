'use client';

/**
 * RemCard category icons (stroke SVGs, 64×64).
 */

import type { FC, ReactNode } from 'react';

export type IconProps = { className?: string };

const S = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 64 64',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function wrap(children: ReactNode, className?: string) {
  return (
    <svg {...S} className={className}>
      {children}
    </svg>
  );
}

export const CategoryIconDoors: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={8} y={6} width={48} height={54} rx={0.5} />
      <line x1={8} y1={60} x2={4} y2={62} />
      <line x1={56} y1={60} x2={60} y2={62} />
      <line x1={4} y1={62} x2={60} y2={62} />
      <line x1={8} y1={6} x2={6} y2={4} />
      <line x1={56} y1={6} x2={58} y2={4} />
      <line x1={6} y1={4} x2={58} y2={4} />
      <line x1={32} y1={8} x2={32} y2={58} />
      <rect x={12} y={12} width={16} height={18} rx={0.5} />
      <rect x={12} y={34} width={16} height={18} rx={0.5} />
      <rect x={36} y={12} width={16} height={18} rx={0.5} />
      <rect x={36} y={34} width={16} height={18} rx={0.5} />
      <rect x={14} y={14} width={12} height={14} rx={0.3} />
      <rect x={14} y={36} width={12} height={14} rx={0.3} />
      <rect x={38} y={14} width={12} height={14} rx={0.3} />
      <rect x={38} y={36} width={12} height={14} rx={0.3} />
      <circle cx={37.5} cy={42} r={1.2} />
      <circle cx={30.5} cy={42} r={1.2} />
      <line x1={6} y1={60} x2={58} y2={60} />
    </>,
    className
  );

export const CategoryIconTiles: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <polygon points="16,12 52,12 58,18 22,18" />
      <polygon points="16,12 22,18 22,54 16,48" />
      <rect x={22} y={18} width={36} height={36} />
      <line x1={22} y1={30} x2={58} y2={30} />
      <line x1={22} y1={42} x2={58} y2={42} />
      <line x1={34} y1={18} x2={34} y2={54} />
      <line x1={46} y1={18} x2={46} y2={54} />
      <line x1={28} y1={12} x2={34} y2={18} />
      <line x1={40} y1={12} x2={46} y2={18} />
      <line x1={16} y1={24} x2={22} y2={30} />
      <line x1={16} y1={36} x2={22} y2={42} />
      <line x1={24} y1={21} x2={32} y2={21} strokeWidth={0.5} opacity={0.4} />
      <line x1={24} y1={24} x2={32} y2={24} strokeWidth={0.5} opacity={0.4} />
      <line x1={36} y1={33} x2={44} y2={33} strokeWidth={0.5} opacity={0.4} />
      <line x1={36} y1={36} x2={44} y2={36} strokeWidth={0.5} opacity={0.4} />
      <line x1={48} y1={45} x2={56} y2={45} strokeWidth={0.5} opacity={0.4} />
      <line x1={48} y1={48} x2={56} y2={48} strokeWidth={0.5} opacity={0.4} />
      <line x1={6} y1={60} x2={6} y2={60} strokeWidth={0} />
    </>,
    className
  );

export const CategoryIconPlumbing: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M8,28 Q8,22 14,20 L50,20 Q56,22 56,28 L56,42 Q56,50 48,52 L16,52 Q8,50 8,42 Z" />
      <path d="M6,28 Q6,20 14,18 L50,18 Q58,20 58,28" strokeWidth={1.2} />
      <path d="M10,28 Q10,24 14,22 L50,22 Q54,24 54,28" />
      <path d="M14,52 Q12,56 10,58 Q9,59 10,60" />
      <path d="M22,52 Q21,56 19,58 Q18,59 19,60" />
      <path d="M42,52 Q43,56 45,58 Q46,59 45,60" />
      <path d="M50,52 Q52,56 54,58 Q55,59 54,60" />
      <circle cx={10} cy={60} r={1} strokeWidth={0.8} />
      <circle cx={19} cy={60} r={1} strokeWidth={0.8} />
      <circle cx={45} cy={60} r={1} strokeWidth={0.8} />
      <circle cx={54} cy={60} r={1} strokeWidth={0.8} />
      <path d="M48,18 L48,12 Q48,10 50,10 L52,10 Q54,10 54,12 L54,14" />
      <line x1={54} y1={14} x2={52} y2={14} />
      <line x1={46} y1={10} x2={50} y2={10} strokeWidth={0.8} />
      <circle cx={48} cy={10} r={1.5} strokeWidth={0.8} />
      <circle cx={20} cy={48} r={1.5} strokeWidth={0.8} />
    </>,
    className
  );

export const CategoryIconElectrical: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={10} y={6} width={30} height={38} rx={3} />
      <rect x={13} y={9} width={24} height={32} rx={2} />
      <circle cx={20} cy={20} r={2.5} />
      <circle cx={30} cy={20} r={2.5} />
      <path d="M22,30 L28,30" strokeWidth={1.5} />
      <circle cx={25} cy={11} r={0.8} strokeWidth={0.7} />
      <circle cx={25} cy={39} r={0.8} strokeWidth={0.7} />
      <path d="M38,32 L54,32 Q58,32 58,36 L58,48 Q58,52 54,52 L46,52 Q42,52 42,48 L42,36 Q42,32 46,32" />
      <line x1={45} y1={32} x2={45} y2={26} />
      <line x1={53} y1={32} x2={53} y2={26} />
      <line x1={49} y1={36} x2={49} y2={28} />
      <path d="M49,52 Q49,58 44,60 Q38,62 34,60" strokeWidth={1} />
      <path d="M34,60 Q30,58 28,60" strokeWidth={1} />
      <line x1={44} y1={40} x2={54} y2={40} strokeWidth={0.6} opacity={0.5} />
      <line x1={44} y1={44} x2={54} y2={44} strokeWidth={0.6} opacity={0.5} />
    </>,
    className
  );

export const CategoryIconFlooring: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <polygon points="6,44 42,44 48,38 12,38" />
      <polygon points="42,44 48,38 48,34 42,40" />
      <polygon points="6,44 6,40 42,40 42,44" />
      <line x1={10} y1={42} x2={38} y2={42} strokeWidth={0.5} opacity={0.4} />
      <line x1={8} y1={41} x2={40} y2={41} strokeWidth={0.5} opacity={0.3} />
      <polygon points="8,38 44,38 50,32 14,32" />
      <polygon points="44,38 50,32 50,28 44,34" />
      <polygon points="8,38 8,34 44,34 44,38" />
      <line x1={12} y1={36} x2={40} y2={36} strokeWidth={0.5} opacity={0.4} />
      <line x1={10} y1={35} x2={42} y2={35} strokeWidth={0.5} opacity={0.3} />
      <polygon points="10,32 46,32 52,26 16,26" />
      <polygon points="46,32 52,26 52,22 46,28" />
      <polygon points="10,32 10,28 46,28 46,32" />
      <line x1={14} y1={30} x2={42} y2={30} strokeWidth={0.5} opacity={0.4} />
      <line x1={12} y1={29} x2={44} y2={29} strokeWidth={0.5} opacity={0.3} />
      <polygon points="12,26 48,26 54,20 18,20" />
      <polygon points="48,26 54,20 54,16 48,22" />
      <polygon points="12,26 12,22 48,22 48,26" />
      <line x1={16} y1={24} x2={44} y2={24} strokeWidth={0.5} opacity={0.4} />
      <line x1={14} y1={23} x2={46} y2={23} strokeWidth={0.5} opacity={0.3} />
      <line x1={20} y1={20.5} x2={50} y2={20.5} strokeWidth={0.5} opacity={0.3} />
      <line x1={4} y1={50} x2={60} y2={50} strokeWidth={0.6} opacity={0.3} />
      <line x1={6} y1={44} x2={6} y2={50} strokeWidth={0.6} opacity={0.3} />
      <line x1={42} y1={44} x2={42} y2={50} strokeWidth={0.6} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconPaint: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <ellipse cx={24} cy={52} rx={14} ry={4} />
      <line x1={10} y1={28} x2={10} y2={52} />
      <line x1={38} y1={28} x2={38} y2={52} />
      <ellipse cx={24} cy={28} rx={14} ry={4} />
      <ellipse cx={24} cy={26} rx={14} ry={4} />
      <ellipse cx={24} cy={27} rx={11} ry={3} strokeWidth={0.7} opacity={0.5} />
      <path d="M14,26 Q14,16 24,16 Q34,16 34,26" strokeWidth={1} />
      <circle cx={14} cy={26} r={1} strokeWidth={0.7} />
      <circle cx={34} cy={26} r={1} strokeWidth={0.7} />
      <path d="M10,36 Q24,40 38,36" strokeWidth={0.6} opacity={0.4} />
      <path d="M10,44 Q24,48 38,44" strokeWidth={0.6} opacity={0.4} />
      <path d="M36,28 Q40,30 39,34" strokeWidth={0.8} />
      <line x1={44} y1={14} x2={38} y2={52} />
      <rect x={42} y={8} width={5} height={14} rx={1} transform="rotate(-10 44 14)" />
      <path d="M38,46 L36,52 L40,52 Z" strokeWidth={0.8} />
      <line x1={40.5} y1={39} x2={39} y2={44} strokeWidth={2} opacity={0.3} />
      <line x1={43} y1={11} x2={46} y2={10.5} strokeWidth={0.5} opacity={0.5} />
      <line x1={43.2} y1={13} x2={46.2} y2={12.5} strokeWidth={0.5} opacity={0.5} />
      <line x1={43.4} y1={15} x2={46.4} y2={14.5} strokeWidth={0.5} opacity={0.5} />
    </>,
    className
  );

export const CategoryIconWallpaper: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <ellipse cx={44} cy={32} rx={6} ry={14} />
      <ellipse cx={44} cy={32} rx={2.5} ry={6} strokeWidth={0.7} />
      <line x1={44} y1={18} x2={26} y2={18} />
      <line x1={44} y1={46} x2={26} y2={46} />
      <path d="M26,18 Q18,18 14,22 Q10,26 10,34 Q10,42 14,48 Q16,52 14,56 Q12,60 8,60" />
      <path d="M26,46 Q22,46 20,44 Q16,40 16,34 Q16,28 20,24 Q22,22 22,26 Q22,32 20,38 Q18,44 16,48 Q14,54 12,58" />
      <circle cx={14} cy={30} r={0.8} strokeWidth={0.6} />
      <circle cx={12} cy={38} r={0.8} strokeWidth={0.6} />
      <circle cx={14} cy={46} r={0.8} strokeWidth={0.6} />
      <circle cx={10} cy={52} r={0.8} strokeWidth={0.6} />
      <circle cx={30} cy={24} r={0.8} strokeWidth={0.6} />
      <circle cx={36} cy={22} r={0.8} strokeWidth={0.6} />
      <circle cx={33} cy={30} r={0.8} strokeWidth={0.6} />
      <circle cx={30} cy={38} r={0.8} strokeWidth={0.6} />
      <circle cx={36} cy={42} r={0.8} strokeWidth={0.6} />
      <circle cx={33} cy={34} r={0.8} strokeWidth={0.6} />
      <ellipse cx={26} cy={32} rx={0.5} ry={14} strokeWidth={0.6} opacity={0.4} />
    </>,
    className
  );

export const CategoryIconLighting: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M16,28 L32,8 L48,28" />
      <line x1={16} y1={28} x2={48} y2={28} />
      <path d="M18,28 L32,10 L46,28" strokeWidth={0.6} opacity={0.3} />
      <line x1={22} y1={18} x2={42} y2={18} strokeWidth={0.5} opacity={0.4} />
      <line x1={19} y1={23} x2={45} y2={23} strokeWidth={0.5} opacity={0.4} />
      <path d="M29,28 Q32,32 35,28" strokeWidth={0.7} opacity={0.4} />
      <line x1={31} y1={28} x2={31} y2={48} />
      <line x1={33} y1={28} x2={33} y2={48} />
      <ellipse cx={32} cy={36} rx={2.5} ry={1} strokeWidth={0.8} />
      <ellipse cx={32} cy={48} rx={3} ry={1.5} />
      <path d="M26,52 Q26,48 29,48" />
      <path d="M38,52 Q38,48 35,48" />
      <ellipse cx={32} cy={52} rx={10} ry={3} />
      <ellipse cx={32} cy={52} rx={7} ry={2} strokeWidth={0.6} opacity={0.4} />
      <path d="M26,52 Q22,56 20,58" strokeWidth={0.8} />
      <rect x={18} y={57} width={4} height={2} rx={0.5} strokeWidth={0.7} />
      <path d="M18,58 Q14,60 10,60" strokeWidth={0.8} />
    </>,
    className
  );

export const CategoryIconFurniture: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M8,20 Q8,16 12,16 L52,16 Q56,16 56,20 L56,34 L8,34 Z" />
      <line x1={12} y1={20} x2={52} y2={20} strokeWidth={0.6} opacity={0.5} />
      <line x1={32} y1={16} x2={32} y2={34} />
      <rect x={8} y={34} width={48} height={10} rx={1.5} />
      <line x1={32} y1={34} x2={32} y2={44} />
      <line x1={12} y1={38} x2={28} y2={38} strokeWidth={0.5} opacity={0.4} />
      <line x1={36} y1={38} x2={52} y2={38} strokeWidth={0.5} opacity={0.4} />
      <path d="M4,22 Q2,22 2,24 L2,42 Q2,44 4,44 L8,44 L8,22 Z" />
      <path d="M60,22 Q62,22 62,24 L62,42 Q62,44 60,44 L56,44 L56,22 Z" />
      <line x1={3} y1={28} x2={7} y2={28} strokeWidth={0.5} opacity={0.4} />
      <line x1={57} y1={28} x2={61} y2={28} strokeWidth={0.5} opacity={0.4} />
      <line x1={8} y1={44} x2={6} y2={52} />
      <line x1={20} y1={44} x2={19} y2={52} />
      <line x1={44} y1={44} x2={45} y2={52} />
      <line x1={56} y1={44} x2={58} y2={52} />
      <line x1={5} y1={52} x2={7} y2={52} strokeWidth={0.8} />
      <line x1={18} y1={52} x2={20} y2={52} strokeWidth={0.8} />
      <line x1={44} y1={52} x2={46} y2={52} strokeWidth={0.8} />
      <line x1={57} y1={52} x2={59} y2={52} strokeWidth={0.8} />
    </>,
    className
  );

export const CategoryIconKitchen: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={6} y={6} width={52} height={52} rx={1} />
      <rect x={4} y={28} width={56} height={3} rx={0.5} />
      <rect x={9} y={9} width={22} height={17} rx={0.5} />
      <rect x={33} y={9} width={22} height={17} rx={0.5} />
      <line x1={28} y1={15} x2={28} y2={20} strokeWidth={1} />
      <line x1={36} y1={15} x2={36} y2={20} strokeWidth={1} />
      <rect x={9} y={34} width={22} height={20} rx={0.5} />
      <rect x={33} y={34} width={22} height={20} rx={0.5} />
      <line x1={28} y1={41} x2={28} y2={47} strokeWidth={1} />
      <line x1={36} y1={41} x2={36} y2={47} strokeWidth={1} />
      <line x1={10} y1={17} x2={30} y2={17} strokeWidth={0.5} opacity={0.3} />
      <line x1={34} y1={17} x2={54} y2={17} strokeWidth={0.5} opacity={0.3} />
      <line x1={10} y1={56} x2={54} y2={56} strokeWidth={0.7} />
      <line x1={10} y1={56} x2={10} y2={58} />
      <line x1={54} y1={56} x2={54} y2={58} />
      <rect x={11} y={11} width={18} height={13} rx={0.3} strokeWidth={0.5} opacity={0.3} />
      <rect x={35} y={11} width={18} height={13} rx={0.3} strokeWidth={0.5} opacity={0.3} />
      <rect x={11} y={36} width={18} height={16} rx={0.3} strokeWidth={0.5} opacity={0.3} />
      <rect x={35} y={36} width={18} height={16} rx={0.3} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconTools: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M12,52 L44,20" />
      <path d="M44,20 L48,14 L52,10 Q56,8 58,10 L58,14 Q58,18 54,18 L48,20 L44,20" />
      <path d="M48,14 L54,14" strokeWidth={0.8} />
      <line x1={14} y1={50} x2={12} y2={52} strokeWidth={1.5} />
      <line x1={20} y1={44} x2={18} y2={46} strokeWidth={0.6} opacity={0.4} />
      <line x1={24} y1={40} x2={22} y2={42} strokeWidth={0.6} opacity={0.4} />
      <path d="M46,54 Q50,54 52,52 Q54,50 54,46 L54,42 Q54,40 52,40 L48,40 Q46,40 46,42 L46,46 Q46,50 46,54" />
      <line x1={47} y1={43} x2={53} y2={43} strokeWidth={0.6} opacity={0.5} />
      <line x1={47} y1={45} x2={53} y2={45} strokeWidth={0.6} opacity={0.5} />
      <line x1={47} y1={47} x2={53} y2={47} strokeWidth={0.6} opacity={0.5} />
      <line x1={47} y1={49} x2={53} y2={49} strokeWidth={0.6} opacity={0.5} />
      <line x1={49.5} y1={40} x2={22} y2={12} />
      <line x1={50.5} y1={40} x2={23} y2={12} />
      <path d="M22,12 L20,8 L24,8 L23,12" />
      <rect x={47} y={38} width={6} height={3} rx={0.5} strokeWidth={0.8} />
    </>,
    className
  );

export const CategoryIconLocks: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={12} y={28} width={40} height={30} rx={3} />
      <rect x={15} y={31} width={34} height={24} rx={2} strokeWidth={0.5} opacity={0.3} />
      <path d="M20,28 L20,16 Q20,6 32,6 Q44,6 44,16 L44,28" strokeWidth={1.2} />
      <path d="M24,28 L24,18 Q24,10 32,10 Q40,10 40,18 L40,28" strokeWidth={0.7} opacity={0.4} />
      <circle cx={32} cy={40} r={4} />
      <path d="M30,43 L30,50 L34,50 L34,43" strokeWidth={1} />
      <circle cx={32} cy={40} r={2} strokeWidth={0.7} />
      <circle cx={18} cy={34} r={1.2} strokeWidth={0.8} />
      <circle cx={46} cy={34} r={1.2} strokeWidth={0.8} />
      <circle cx={18} cy={54} r={1.2} strokeWidth={0.8} />
      <circle cx={46} cy={54} r={1.2} strokeWidth={0.8} />
      <line x1={14} y1={44} x2={50} y2={44} strokeWidth={0.4} opacity={0.2} />
    </>,
    className
  );

export const CategoryIconHandles: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <circle cx={32} cy={32} r={20} />
      <circle cx={32} cy={32} r={18} strokeWidth={0.6} opacity={0.4} />
      <circle cx={32} cy={16} r={1.2} strokeWidth={0.7} />
      <circle cx={32} cy={48} r={1.2} strokeWidth={0.7} />
      <circle cx={32} cy={32} r={5} />
      <circle cx={32} cy={32} r={3.5} strokeWidth={0.6} opacity={0.5} />
      <path d="M37,32 L52,30 Q56,29 58,27 Q60,25 60,22" strokeWidth={1.2} />
      <path d="M37,34 L52,32 Q55,31 57,29" strokeWidth={0.7} opacity={0.4} />
      <path d="M60,22 Q60,20 58,20" strokeWidth={1} />
      <path d="M37,30 Q38,28 37,26" strokeWidth={0.6} opacity={0.4} />
      <line x1={30} y1={32} x2={34} y2={32} strokeWidth={0.5} opacity={0.3} />
      <line x1={32} y1={30} x2={32} y2={34} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconWindows: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={8} y={6} width={48} height={52} rx={1} />
      <rect x={11} y={9} width={42} height={46} rx={0.5} />
      <rect x={9.5} y={7.5} width={45} height={49} rx={0.8} strokeWidth={0.5} opacity={0.3} />
      <line x1={32} y1={9} x2={32} y2={55} />
      <line x1={11} y1={32} x2={53} y2={32} />
      <rect x={13} y={11} width={17} height={19} rx={0.3} strokeWidth={0.5} opacity={0.3} />
      <rect x={34} y={11} width={17} height={19} rx={0.3} strokeWidth={0.5} opacity={0.3} />
      <rect x={13} y={34} width={17} height={19} rx={0.3} strokeWidth={0.5} opacity={0.3} />
      <rect x={34} y={34} width={17} height={19} rx={0.3} strokeWidth={0.5} opacity={0.3} />
      <line x1={34} y1={11} x2={42} y2={7} strokeWidth={0.8} />
      <line x1={42} y1={7} x2={51} y2={11} strokeWidth={0.8} />
      <line x1={30} y1={42} x2={30} y2={46} strokeWidth={1} />
      <line x1={6} y1={58} x2={58} y2={58} strokeWidth={0.7} />
      <line x1={6} y1={58} x2={8} y2={56} />
      <line x1={58} y1={58} x2={56} y2={56} />
    </>,
    className
  );

export const CategoryIconCurtains: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <line x1={4} y1={8} x2={60} y2={8} strokeWidth={1.2} />
      <circle cx={4} cy={8} r={2} strokeWidth={1} />
      <circle cx={60} cy={8} r={2} strokeWidth={1} />
      <line x1={16} y1={8} x2={16} y2={5} strokeWidth={0.8} />
      <line x1={48} y1={8} x2={48} y2={5} strokeWidth={0.8} />
      <path d="M8,10 Q6,20 8,30 Q10,35 8,40 Q6,50 10,56" />
      <path d="M12,10 Q10,18 12,26 Q14,32 12,38 Q10,48 13,56" />
      <path d="M16,10 Q14,16 16,24 Q18,30 16,36 Q14,46 16,56" />
      <path d="M20,10 Q18,14 20,22 Q22,28 20,34 Q18,44 19,56" />
      <path d="M6,36 Q14,34 20,36" strokeWidth={0.8} />
      <path d="M44,10 Q46,14 44,22 Q42,28 44,34 Q46,44 45,56" />
      <path d="M48,10 Q50,16 48,24 Q46,30 48,36 Q50,46 48,56" />
      <path d="M52,10 Q54,18 52,26 Q50,32 52,38 Q54,48 51,56" />
      <path d="M56,10 Q58,20 56,30 Q54,35 56,40 Q58,50 54,56" />
      <path d="M44,36 Q50,34 58,36" strokeWidth={0.8} />
      <circle cx={8} cy={8} r={0.6} strokeWidth={0.5} />
      <circle cx={12} cy={8} r={0.6} strokeWidth={0.5} />
      <circle cx={20} cy={8} r={0.6} strokeWidth={0.5} />
      <circle cx={44} cy={8} r={0.6} strokeWidth={0.5} />
      <circle cx={52} cy={8} r={0.6} strokeWidth={0.5} />
      <circle cx={56} cy={8} r={0.6} strokeWidth={0.5} />
      <line x1={8} y1={56} x2={20} y2={56} strokeWidth={0.6} opacity={0.4} />
      <line x1={44} y1={56} x2={56} y2={56} strokeWidth={0.6} opacity={0.4} />
    </>,
    className
  );

export const CategoryIconConstruction: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <line x1={18} y1={48} x2={36} y2={18} />
      <path d="M16,50 Q14,52 16,54 Q18,56 20,54 L20,48" strokeWidth={1} />
      <path d="M32,20 L30,12 Q30,8 34,8 L44,8 Q48,8 48,12 L48,16 Q48,20 44,20 Z" />
      <path d="M30,12 Q26,8 24,6" strokeWidth={1} />
      <path d="M30,14 Q26,10 25,8" strokeWidth={0.7} />
      <line x1={34} y1={10} x2={44} y2={10} strokeWidth={0.5} opacity={0.4} />
      <line x1={34} y1={14} x2={44} y2={14} strokeWidth={0.5} opacity={0.4} />
      <rect x={8} y={42} width={24} height={8} rx={0.5} />
      <line x1={20} y1={42} x2={20} y2={50} />
      <rect x={4} y={50} width={32} height={8} rx={0.5} />
      <line x1={12} y1={50} x2={12} y2={58} />
      <line x1={24} y1={50} x2={24} y2={58} />
      <line x1={6} y1={54} x2={10} y2={54} strokeWidth={0.4} opacity={0.3} />
      <line x1={14} y1={54} x2={22} y2={54} strokeWidth={0.4} opacity={0.3} />
      <line x1={26} y1={54} x2={34} y2={54} strokeWidth={0.4} opacity={0.3} />
      <line x1={10} y1={46} x2={18} y2={46} strokeWidth={0.4} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconGarden: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M14,24 L10,40 Q10,44 14,44 L40,44 Q44,44 44,40 L42,24 Z" />
      <path d="M12,24 L42,24" strokeWidth={1.2} />
      <path d="M13,28 L41,28" strokeWidth={0.5} opacity={0.3} />
      <circle cx={10} cy={48} r={7} />
      <circle cx={10} cy={48} r={4} strokeWidth={0.7} />
      <circle cx={10} cy={48} r={1.5} strokeWidth={0.6} />
      <line x1={10} y1={41} x2={10} y2={55} strokeWidth={0.5} opacity={0.4} />
      <line x1={3} y1={48} x2={17} y2={48} strokeWidth={0.5} opacity={0.4} />
      <line x1={10} y1={44} x2={14} y2={40} />
      <line x1={32} y1={44} x2={34} y2={54} />
      <line x1={38} y1={44} x2={40} y2={54} />
      <line x1={33} y1={50} x2={39} y2={50} strokeWidth={0.7} />
      <line x1={40} y1={28} x2={58} y2={22} />
      <line x1={40} y1={34} x2={58} y2={28} />
      <line x1={56} y1={22} x2={60} y2={20} strokeWidth={1.2} />
      <line x1={56} y1={28} x2={60} y2={26} strokeWidth={1.2} />
      <line x1={2} y1={56} x2={42} y2={56} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconHeating: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={4} y={30} width={56} height={8} rx={4} />
      <rect x={14} y={28} width={6} height={12} rx={1} />
      <rect x={44} y={28} width={6} height={12} rx={1} />
      <rect x={28} y={8} width={8} height={24} rx={4} />
      <rect x={26} y={26} width={12} height={6} rx={1} />
      <circle cx={32} cy={10} r={7} />
      <circle cx={32} cy={10} r={5} strokeWidth={0.7} />
      <line x1={32} y1={3} x2={32} y2={17} strokeWidth={0.8} />
      <line x1={25} y1={10} x2={39} y2={10} strokeWidth={0.8} />
      <line x1={27} y1={5} x2={37} y2={15} strokeWidth={0.6} />
      <line x1={37} y1={5} x2={27} y2={15} strokeWidth={0.6} />
      <circle cx={32} cy={10} r={2} strokeWidth={0.8} />
      <rect x={30} y={16} width={4} height={4} rx={0.5} strokeWidth={0.8} />
      <line x1={4} y1={28} x2={4} y2={40} strokeWidth={0.6} opacity={0.4} />
      <line x1={60} y1={28} x2={60} y2={40} strokeWidth={0.6} opacity={0.4} />
      <line x1={6} y1={32} x2={6} y2={36} strokeWidth={0.4} opacity={0.3} />
      <line x1={8} y1={31} x2={8} y2={37} strokeWidth={0.4} opacity={0.3} />
      <line x1={56} y1={32} x2={56} y2={36} strokeWidth={0.4} opacity={0.3} />
      <line x1={58} y1={31} x2={58} y2={37} strokeWidth={0.4} opacity={0.3} />
      <rect x={28} y={38} width={8} height={18} rx={4} />
      <rect x={26} y={50} width={12} height={6} rx={1} />
    </>,
    className
  );

export const CategoryIconBathSauna: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M14,30 L12,52 Q12,56 18,56 L46,56 Q52,56 52,52 L50,30" />
      <ellipse cx={32} cy={30} rx={18} ry={5} />
      <ellipse cx={32} cy={54} rx={16} ry={3.5} strokeWidth={0.7} opacity={0.4} />
      <line x1={20} y1={30} x2={18} y2={54} strokeWidth={0.6} opacity={0.4} />
      <line x1={26} y1={30} x2={25} y2={56} strokeWidth={0.6} opacity={0.4} />
      <line x1={32} y1={30} x2={32} y2={56} strokeWidth={0.6} opacity={0.4} />
      <line x1={38} y1={30} x2={39} y2={56} strokeWidth={0.6} opacity={0.4} />
      <line x1={44} y1={30} x2={46} y2={54} strokeWidth={0.6} opacity={0.4} />
      <path d="M14,36 Q32,40 50,36" strokeWidth={1} />
      <path d="M13,46 Q32,50 51,46" strokeWidth={1} />
      <line x1={42} y1={26} x2={56} y2={12} />
      <path d="M38,28 Q40,24 44,24 Q46,24 46,28 Q46,30 42,30" strokeWidth={1} />
      <path d="M22,24 Q20,18 22,12" strokeWidth={0.8} opacity={0.6} />
      <path d="M28,22 Q26,14 28,8" strokeWidth={0.8} opacity={0.6} />
      <path d="M34,24 Q32,16 34,10" strokeWidth={0.8} opacity={0.6} />
      <circle cx={56} cy={12} r={1.5} strokeWidth={0.8} />
    </>,
    className
  );

export const CategoryIconPools: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M6,24 L32,12 L58,24 L58,48 L32,60 L6,48 Z" />
      <path d="M6,24 L32,12 L58,24 L32,36 Z" strokeWidth={0.7} />
      <line x1={32} y1={36} x2={32} y2={60} />
      <line x1={6} y1={24} x2={6} y2={48} />
      <path d="M8,26 L32,38 L56,26" strokeWidth={0.7} opacity={0.5} />
      <path d="M12,28 Q18,30 24,28 Q30,26 36,30 Q42,32 48,28 Q52,26 54,27" strokeWidth={0.6} opacity={0.4} />
      <path d="M14,32 Q20,34 26,32 Q32,30 38,34 Q44,36 50,32" strokeWidth={0.6} opacity={0.4} />
      <path d="M16,36 Q22,38 28,36 Q34,34 40,38 Q46,40 50,36" strokeWidth={0.6} opacity={0.3} />
      <line x1={46} y1={16} x2={46} y2={32} />
      <line x1={52} y1={18} x2={52} y2={30} />
      <line x1={46} y1={20} x2={52} y2={21} />
      <line x1={46} y1={24} x2={52} y2={25} />
      <line x1={46} y1={28} x2={52} y2={28} />
      <path d="M44,16 Q46,14 48,16" strokeWidth={0.8} />
      <path d="M50,18 Q52,16 54,18" strokeWidth={0.8} />
      <path d="M4,22 L32,10 L60,22" strokeWidth={0.6} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconTextile: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M10,42 L54,42 L54,54 Q54,56 52,56 L12,56 Q10,56 10,54 Z" />
      <line x1={12} y1={46} x2={52} y2={46} strokeWidth={0.5} opacity={0.3} />
      <path d="M10,42 Q32,40 54,42" strokeWidth={0.8} />
      <line x1={14} y1={50} x2={50} y2={50} strokeWidth={0.4} opacity={0.3} />
      <line x1={14} y1={53} x2={50} y2={53} strokeWidth={0.4} opacity={0.3} />
      <path d="M12,28 L52,28 L52,42 L12,42 Z" />
      <path d="M12,28 Q32,26 52,28" strokeWidth={0.8} />
      <line x1={14} y1={32} x2={50} y2={32} strokeWidth={0.5} opacity={0.3} />
      <line x1={14} y1={36} x2={50} y2={36} strokeWidth={0.4} opacity={0.3} />
      <line x1={14} y1={39} x2={50} y2={39} strokeWidth={0.4} opacity={0.3} />
      <path d="M14,14 L50,14 L50,28 L14,28 Z" />
      <path d="M14,14 Q32,12 50,14" strokeWidth={0.8} />
      <line x1={16} y1={18} x2={48} y2={18} strokeWidth={0.5} opacity={0.3} />
      <line x1={16} y1={22} x2={48} y2={22} strokeWidth={0.4} opacity={0.3} />
      <line x1={16} y1={25} x2={48} y2={25} strokeWidth={0.4} opacity={0.3} />
      <line x1={14} y1={20} x2={50} y2={20} strokeWidth={0.7} opacity={0.6} />
      <line x1={10} y1={42} x2={12} y2={28} strokeWidth={0.6} opacity={0.4} />
      <line x1={54} y1={42} x2={52} y2={28} strokeWidth={0.6} opacity={0.4} />
    </>,
    className
  );

export const CategoryIconCeilings: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M4,16 L60,16 L56,8 L8,8 Z" />
      <rect x={4} y={16} width={56} height={6} rx={0} />
      <line x1={8} y1={18} x2={56} y2={18} strokeDasharray="3,2" strokeWidth={0.6} opacity={0.4} />
      <line x1={8} y1={20} x2={56} y2={20} strokeDasharray="3,2" strokeWidth={0.6} opacity={0.4} />
      <line x1={8} y1={8} x2={4} y2={16} strokeWidth={0.8} />
      <line x1={56} y1={8} x2={60} y2={16} strokeWidth={0.8} />
      <circle cx={32} cy={16} r={5} />
      <circle cx={32} cy={16} r={3.5} strokeWidth={0.7} />
      <path d="M27,22 L20,42" strokeWidth={0.6} opacity={0.4} />
      <path d="M37,22 L44,42" strokeWidth={0.6} opacity={0.4} />
      <path d="M28,22 L22,38 L42,38 L36,22" strokeWidth={0.4} opacity={0.15} />
      <circle cx={14} cy={16} r={3.5} />
      <circle cx={14} cy={16} r={2} strokeWidth={0.7} />
      <circle cx={50} cy={16} r={3.5} />
      <circle cx={50} cy={16} r={2} strokeWidth={0.7} />
      <line x1={4} y1={22} x2={60} y2={22} strokeWidth={0.5} opacity={0.3} />
      <line x1={4} y1={16} x2={4} y2={48} strokeWidth={0.5} opacity={0.3} />
      <line x1={60} y1={16} x2={60} y2={48} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconDecor: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={6} y={6} width={34} height={28} rx={1} />
      <rect x={9} y={9} width={28} height={22} rx={0.5} />
      <rect x={11} y={11} width={24} height={18} rx={0.3} strokeWidth={0.6} opacity={0.4} />
      <path d="M13,25 L19,17 L25,23 L29,19 L33,25" strokeWidth={0.6} opacity={0.4} />
      <circle cx={16} cy={15} r={1.5} strokeWidth={0.5} opacity={0.4} />
      <path d="M14,6 L23,2 L32,6" strokeWidth={0.6} opacity={0.4} />
      <path d="M46,36 L42,56 L56,56 L52,36 Z" />
      <path d="M44,36 L54,36" strokeWidth={1.2} />
      <path d="M47,36 Q46,28 42,22" strokeWidth={0.8} />
      <path d="M49,36 Q49,24 49,18" strokeWidth={0.8} />
      <path d="M51,36 Q52,28 56,22" strokeWidth={0.8} />
      <path d="M42,22 Q38,20 40,16 Q42,18 42,22" strokeWidth={0.7} />
      <path d="M49,18 Q46,14 48,10 Q50,14 49,18" strokeWidth={0.7} />
      <path d="M56,22 Q60,20 58,16 Q56,18 56,22" strokeWidth={0.7} />
      <path d="M45,30 Q42,28 43,25" strokeWidth={0.6} opacity={0.6} />
      <path d="M53,28 Q56,26 55,23" strokeWidth={0.6} opacity={0.6} />
      <line x1={44} y1={44} x2={54} y2={44} strokeWidth={0.5} opacity={0.3} />
      <line x1={43} y1={50} x2={55} y2={50} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconGates: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={4} y={8} width={6} height={48} rx={0.5} />
      <rect x={3} y={6} width={8} height={4} rx={0.5} />
      <rect x={54} y={8} width={6} height={48} rx={0.5} />
      <rect x={53} y={6} width={8} height={4} rx={0.5} />
      <line x1={10} y1={14} x2={54} y2={14} strokeWidth={1.2} />
      <line x1={10} y1={48} x2={54} y2={48} strokeWidth={1.2} />
      <line x1={10} y1={31} x2={54} y2={31} strokeWidth={0.8} />
      <line x1={16} y1={14} x2={16} y2={48} />
      <line x1={22} y1={14} x2={22} y2={48} />
      <line x1={28} y1={14} x2={28} y2={48} />
      <line x1={34} y1={14} x2={34} y2={48} />
      <line x1={40} y1={14} x2={40} y2={48} />
      <line x1={46} y1={14} x2={46} y2={48} />
      <circle cx={16} cy={13} r={1} strokeWidth={0.7} />
      <circle cx={22} cy={13} r={1} strokeWidth={0.7} />
      <circle cx={28} cy={13} r={1} strokeWidth={0.7} />
      <circle cx={34} cy={13} r={1} strokeWidth={0.7} />
      <circle cx={40} cy={13} r={1} strokeWidth={0.7} />
      <circle cx={46} cy={13} r={1} strokeWidth={0.7} />
      <rect x={2} y={54} width={60} height={3} rx={0.5} />
      <circle cx={16} cy={52} r={2} strokeWidth={0.8} />
      <circle cx={40} cy={52} r={2} strokeWidth={0.8} />
      <line x1={2} y1={58} x2={62} y2={58} strokeWidth={0.6} opacity={0.4} />
      <path d="M24,60 L34,60 L32,59 M34,60 L32,61" strokeWidth={0.6} opacity={0.5} />
    </>,
    className
  );

export const CategoryIconFireplaces: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={4} y={8} width={56} height={5} rx={1} />
      <rect x={8} y={13} width={48} height={44} rx={1} />
      <rect x={10} y={15} width={44} height={40} rx={0.5} strokeWidth={0.7} />
      <path d="M18,55 L18,32 Q18,22 32,22 Q46,22 46,32 L46,55" />
      <path d="M20,55 L20,33 Q20,24 32,24 Q44,24 44,33 L44,55" strokeWidth={0.7} opacity={0.4} />
      <line x1={12} y1={20} x2={17} y2={20} strokeWidth={0.5} opacity={0.3} />
      <line x1={47} y1={20} x2={52} y2={20} strokeWidth={0.5} opacity={0.3} />
      <line x1={10} y1={26} x2={17} y2={26} strokeWidth={0.5} opacity={0.3} />
      <line x1={47} y1={26} x2={54} y2={26} strokeWidth={0.5} opacity={0.3} />
      <line x1={10} y1={32} x2={18} y2={32} strokeWidth={0.5} opacity={0.3} />
      <line x1={46} y1={32} x2={54} y2={32} strokeWidth={0.5} opacity={0.3} />
      <path d="M26,52 Q24,44 28,38 Q30,42 28,46 Q30,40 32,36 Q34,42 32,48 Q34,40 36,36 Q38,42 36,48 Q38,44 38,52" strokeWidth={0.8} />
      <path d="M30,52 Q29,46 31,42 Q33,46 32,50 Q33,44 35,42 Q36,46 34,52" strokeWidth={0.6} opacity={0.5} />
      <rect x={6} y={55} width={52} height={4} rx={0.5} />
      <line x1={6} y1={11} x2={58} y2={11} strokeWidth={0.5} opacity={0.3} />
      <path d="M30,22 L32,19 L34,22" strokeWidth={0.7} />
    </>,
    className
  );

export const CategoryIconSmartHome: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M6,30 L32,8 L58,30" />
      <path d="M10,28 L10,56 L54,56 L54,28" />
      <path d="M8,30 L32,10 L56,30" strokeWidth={0.7} opacity={0.4} />
      <rect x={42} y={14} width={6} height={12} rx={0.5} strokeWidth={0.8} />
      <rect x={26} y={42} width={12} height={14} rx={0.5} />
      <circle cx={36} cy={50} r={0.8} strokeWidth={0.7} />
      <rect x={14} y={34} width={8} height={8} rx={0.5} />
      <line x1={18} y1={34} x2={18} y2={42} strokeWidth={0.6} />
      <line x1={14} y1={38} x2={22} y2={38} strokeWidth={0.6} />
      <rect x={42} y={34} width={8} height={8} rx={0.5} />
      <line x1={46} y1={34} x2={46} y2={42} strokeWidth={0.6} />
      <line x1={42} y1={38} x2={50} y2={38} strokeWidth={0.6} />
      <path d="M26,32 Q32,26 38,32" strokeWidth={1} opacity={0.8} />
      <path d="M28,30 Q32,28 36,30" strokeWidth={0.9} opacity={0.6} />
      <path d="M30,28 Q32,27 34,28" strokeWidth={0.8} opacity={0.4} />
      <circle cx={32} cy={33} r={1.2} strokeWidth={0.8} />
      <line x1={8} y1={56} x2={56} y2={56} strokeWidth={0.7} />
    </>,
    className
  );

export const CategoryIconClimate: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <line x1={6} y1={10} x2={6} y2={44} strokeWidth={0.6} opacity={0.3} />
      <rect x={8} y={12} width={48} height={22} rx={3} />
      <rect x={10} y={14} width={44} height={18} rx={2} strokeWidth={0.6} opacity={0.4} />
      <line x1={12} y1={20} x2={52} y2={20} strokeWidth={0.5} opacity={0.3} />
      <line x1={12} y1={30} x2={52} y2={30} strokeWidth={0.7} />
      <line x1={12} y1={32} x2={52} y2={32} strokeWidth={0.7} />
      <rect x={40} y={16} width={10} height={3} rx={0.5} strokeWidth={0.6} />
      <circle cx={14} cy={17.5} r={1} strokeWidth={0.6} />
      <line x1={24} y1={22} x2={36} y2={22} strokeWidth={0.5} opacity={0.3} />
      <path d="M16,34 Q14,42 12,48" strokeWidth={0.8} opacity={0.6} />
      <path d="M24,34 Q22,44 18,52" strokeWidth={0.8} opacity={0.6} />
      <path d="M32,34 Q30,44 28,52" strokeWidth={0.8} opacity={0.5} />
      <path d="M40,34 Q38,44 36,50" strokeWidth={0.8} opacity={0.5} />
      <path d="M48,34 Q46,42 44,48" strokeWidth={0.8} opacity={0.4} />
      <path d="M10,40 Q30,44 52,40" strokeWidth={0.6} opacity={0.3} />
      <path d="M12,46 Q30,50 50,46" strokeWidth={0.6} opacity={0.25} />
      <circle cx={12} cy={12} r={0.7} strokeWidth={0.5} />
      <circle cx={52} cy={12} r={0.7} strokeWidth={0.5} />
    </>,
    className
  );

export const CategoryIconDesign: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M10,54 L8,58 L12,56 L48,20 L44,16 Z" />
      <line x1={44} y1={16} x2={48} y2={20} />
      <path d="M44,16 L48,12 Q50,10 52,12 L54,14 Q56,16 54,18 L48,20" strokeWidth={1} />
      <line x1={14} y1={50} x2={18} y2={46} strokeWidth={0.6} opacity={0.4} />
      <line x1={42} y1={18} x2={46} y2={14} strokeWidth={0.6} opacity={0.4} />
      <line x1={45} y1={17} x2={49} y2={21} strokeWidth={0.8} />
      <rect x={16} y={38} width={6} height={18} rx={1} transform="rotate(-30 19 47)" strokeWidth={0.9} />
      <rect x={20} y={38} width={6} height={18} rx={1} transform="rotate(-15 23 47)" strokeWidth={0.9} />
      <rect x={24} y={38} width={6} height={18} rx={1} transform="rotate(0 27 47)" strokeWidth={0.9} />
      <rect x={28} y={38} width={6} height={18} rx={1} transform="rotate(15 31 47)" strokeWidth={0.9} />
      <rect x={32} y={38} width={6} height={18} rx={1} transform="rotate(30 35 47)" strokeWidth={0.9} />
      <circle cx={27} cy={56} r={1.5} strokeWidth={0.8} />
      <circle cx={17} cy={42} r={1} strokeWidth={0.5} opacity={0.5} />
      <circle cx={22} cy={40} r={1} strokeWidth={0.5} opacity={0.5} />
      <circle cx={27} cy={40} r={1} strokeWidth={0.5} opacity={0.5} />
    </>,
    className
  );

export const CategoryIconLandscape: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <line x1={16} y1={40} x2={16} y2={54} />
      <path d="M8,40 Q8,28 16,22 Q24,28 24,40 Z" />
      <path d="M10,36 Q10,28 16,24 Q22,28 22,36" strokeWidth={0.6} opacity={0.4} />
      <line x1={48} y1={38} x2={48} y2={54} />
      <circle cx={48} cy={28} r={12} />
      <circle cx={48} cy={28} r={9} strokeWidth={0.6} opacity={0.4} />
      <path d="M28,56 Q30,50 32,46 Q36,40 34,34 Q32,28 36,24 Q38,22 36,18" />
      <path d="M34,56 Q36,50 38,46 Q42,40 40,34 Q38,28 42,24 Q44,22 42,18" />
      <path d="M30,52 L36,52" strokeWidth={0.5} opacity={0.3} />
      <path d="M33,44 L39,44" strokeWidth={0.5} opacity={0.3} />
      <path d="M33,36 L39,36" strokeWidth={0.5} opacity={0.3} />
      <line x1={4} y1={56} x2={60} y2={56} strokeWidth={0.7} />
      <path d="M4,54 Q6,50 10,54" strokeWidth={0.7} />
      <path d="M52,54 Q56,50 60,54" strokeWidth={0.7} />
      <path d="M12,34 Q10,32 8,34" strokeWidth={0.5} opacity={0.4} />
      <path d="M20,34 Q22,32 24,34" strokeWidth={0.5} opacity={0.4} />
    </>,
    className
  );

export const CategoryIconAppraisal: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M6,30 L28,10 L50,30" />
      <path d="M10,28 L10,52 L46,52 L46,28" />
      <path d="M4,32 L28,10 L52,32" strokeWidth={0.7} opacity={0.4} />
      <rect x={22} y={38} width={12} height={14} rx={0.5} />
      <circle cx={32} cy={46} r={0.8} strokeWidth={0.7} />
      <rect x={13} y={34} width={6} height={6} rx={0.5} />
      <rect x={37} y={34} width={6} height={6} rx={0.5} />
      <rect x={38} y={16} width={5} height={10} rx={0.5} strokeWidth={0.8} />
      <circle cx={46} cy={36} r={12} />
      <circle cx={46} cy={36} r={10} strokeWidth={0.7} opacity={0.4} />
      <line x1={54} y1={44} x2={62} y2={56} strokeWidth={2} />
      <line x1={54} y1={44} x2={62} y2={56} strokeWidth={1.2} />
      <rect x={58} y={52} width={6} height={8} rx={1.5} transform="rotate(-45 61 56)" strokeWidth={0.8} />
      <path d="M40,30 Q42,28 44,30" strokeWidth={0.6} opacity={0.4} />
      <path d="M42,38 L45,42 L52,34" strokeWidth={0.8} opacity={0.5} />
    </>,
    className
  );

export const CategoryIconPlanning: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M8,8 L8,56 L20,56 L20,20 L56,20 L56,8 Z" />
      <path d="M12,12 L12,52 L18,52 L18,18 L52,18 L52,12 Z" strokeWidth={0.6} opacity={0.4} />
      <line x1={8} y1={16} x2={12} y2={16} strokeWidth={0.6} />
      <line x1={8} y1={24} x2={11} y2={24} strokeWidth={0.5} />
      <line x1={8} y1={28} x2={12} y2={28} strokeWidth={0.6} />
      <line x1={8} y1={32} x2={11} y2={32} strokeWidth={0.5} />
      <line x1={8} y1={36} x2={12} y2={36} strokeWidth={0.6} />
      <line x1={8} y1={40} x2={11} y2={40} strokeWidth={0.5} />
      <line x1={8} y1={44} x2={12} y2={44} strokeWidth={0.6} />
      <line x1={8} y1={48} x2={11} y2={48} strokeWidth={0.5} />
      <line x1={24} y1={8} x2={24} y2={12} strokeWidth={0.6} />
      <line x1={28} y1={8} x2={28} y2={11} strokeWidth={0.5} />
      <line x1={32} y1={8} x2={32} y2={12} strokeWidth={0.6} />
      <line x1={36} y1={8} x2={36} y2={11} strokeWidth={0.5} />
      <line x1={40} y1={8} x2={40} y2={12} strokeWidth={0.6} />
      <line x1={44} y1={8} x2={44} y2={11} strokeWidth={0.5} />
      <line x1={48} y1={8} x2={48} y2={12} strokeWidth={0.6} />
      <line x1={26} y1={52} x2={52} y2={26} />
      <path d="M52,26 L54,24 L56,26 L54,28 Z" strokeWidth={0.9} />
      <path d="M24,54 L26,52 L28,54 Z" strokeWidth={0.8} />
      <line x1={30} y1={48} x2={48} y2={30} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconRough: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={6} y={28} width={20} height={8} rx={0.3} />
      <rect x={28} y={28} width={20} height={8} rx={0.3} />
      <rect x={50} y={28} width={10} height={8} rx={0.3} />
      <rect x={6} y={38} width={10} height={8} rx={0.3} />
      <rect x={18} y={38} width={20} height={8} rx={0.3} />
      <rect x={40} y={38} width={20} height={8} rx={0.3} />
      <rect x={6} y={48} width={20} height={8} rx={0.3} />
      <rect x={28} y={48} width={20} height={8} rx={0.3} />
      <rect x={50} y={48} width={10} height={8} rx={0.3} />
      <rect x={6} y={18} width={20} height={8} rx={0.3} />
      <rect x={28} y={18} width={14} height={8} rx={0.3} strokeDasharray="2,1" opacity={0.5} />
      <path d="M50,6 L56,6 Q58,6 58,8 L58,12 Q58,14 56,14 L50,14 Q48,14 48,12 L48,8 Q48,6 50,6" />
      <line x1={50} y1={8} x2={56} y2={8} strokeWidth={0.5} opacity={0.4} />
      <line x1={50} y1={10} x2={56} y2={10} strokeWidth={0.5} opacity={0.4} />
      <line x1={50} y1={12} x2={56} y2={12} strokeWidth={0.5} opacity={0.4} />
      <line x1={48} y1={10} x2={42} y2={16} />
      <path d="M42,16 L28,16 L24,22 L42,22 Z" />
      <path d="M30,18 Q34,17 38,18" strokeWidth={0.5} opacity={0.4} />
      <circle cx={46} cy={24} r={0.8} strokeWidth={0.5} opacity={0.4} />
      <circle cx={22} cy={16} r={0.6} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconEngineering: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <circle cx={26} cy={28} r={16} />
      <circle cx={26} cy={28} r={12} strokeWidth={0.7} />
      <circle cx={26} cy={28} r={5} />
      <line x1={26} y1={8} x2={26} y2={12} strokeWidth={3} />
      <line x1={26} y1={44} x2={26} y2={48} strokeWidth={3} />
      <line x1={6} y1={28} x2={10} y2={28} strokeWidth={3} />
      <line x1={42} y1={28} x2={46} y2={28} strokeWidth={3} />
      <line x1={14.7} y1={16.7} x2={17.5} y2={19.5} strokeWidth={3} />
      <line x1={34.5} y1={36.5} x2={37.3} y2={39.3} strokeWidth={3} />
      <line x1={14.7} y1={39.3} x2={17.5} y2={36.5} strokeWidth={3} />
      <line x1={34.5} y1={19.5} x2={37.3} y2={16.7} strokeWidth={3} />
      <line x1={24} y1={28} x2={28} y2={28} strokeWidth={0.6} />
      <line x1={26} y1={26} x2={26} y2={30} strokeWidth={0.6} />
      <rect x={42} y={40} width={18} height={8} rx={4} />
      <rect x={40} y={38} width={6} height={12} rx={1} />
      <line x1={38} y1={42} x2={34} y2={36} strokeWidth={1} />
      <line x1={38} y1={48} x2={34} y2={42} strokeWidth={1} />
      <ellipse cx={60} cy={44} rx={0.5} ry={4} strokeWidth={0.7} />
      <line x1={56} y1={41} x2={56} y2={47} strokeWidth={0.4} opacity={0.3} />
      <line x1={58} y1={41} x2={58} y2={47} strokeWidth={0.4} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconFinishing: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M42,6 L50,6 Q54,6 54,10 L54,26 Q54,30 50,30 L42,30 Q38,30 38,26 L38,10 Q38,6 42,6" />
      <line x1={40} y1={10} x2={52} y2={10} strokeWidth={0.5} opacity={0.4} />
      <line x1={40} y1={14} x2={52} y2={14} strokeWidth={0.5} opacity={0.4} />
      <line x1={40} y1={18} x2={52} y2={18} strokeWidth={0.5} opacity={0.4} />
      <line x1={40} y1={22} x2={52} y2={22} strokeWidth={0.5} opacity={0.4} />
      <line x1={40} y1={26} x2={52} y2={26} strokeWidth={0.5} opacity={0.4} />
      <rect x={36} y={28} width={20} height={4} rx={0.5} />
      <path d="M34,32 L58,32 L60,54 Q60,58 56,58 L10,58 Q6,58 8,54 L34,32" />
      <path d="M36,34 L56,34 L58,52" strokeWidth={0.6} opacity={0.3} />
      <path d="M8,56 Q20,50 32,52 Q44,54 56,48" strokeWidth={0.7} opacity={0.4} />
      <path d="M10,52 Q22,46 34,48 Q46,50 56,44" strokeWidth={0.6} opacity={0.3} />
      <path d="M14,48 Q26,42 38,44 Q50,46 58,40" strokeWidth={0.5} opacity={0.2} />
      <line x1={4} y1={58} x2={62} y2={58} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconRenovation: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M6,30 L32,8 L58,30" />
      <path d="M10,28 L10,56 L54,56 L54,28" />
      <path d="M8,30 L32,10 L56,30" strokeWidth={0.7} opacity={0.4} />
      <rect x={42} y={14} width={5} height={12} rx={0.5} strokeWidth={0.8} />
      <rect x={24} y={40} width={16} height={16} rx={0.5} />
      <circle cx={32} cy={36} r={6} />
      <circle cx={32} cy={36} r={4} strokeWidth={0.7} />
      <circle cx={32} cy={35} r={1.5} strokeWidth={0.8} />
      <line x1={32} y1={42} x2={32} y2={56} strokeWidth={1.2} />
      <line x1={32} y1={48} x2={36} y2={48} strokeWidth={1} />
      <line x1={32} y1={52} x2={36} y2={52} strokeWidth={1} />
      <line x1={32} y1={50} x2={34} y2={50} strokeWidth={0.8} />
      <rect x={13} y={34} width={7} height={7} rx={0.5} />
      <line x1={16.5} y1={34} x2={16.5} y2={41} strokeWidth={0.6} />
      <rect x={44} y={34} width={7} height={7} rx={0.5} />
      <line x1={47.5} y1={34} x2={47.5} y2={41} strokeWidth={0.6} />
      <line x1={8} y1={56} x2={56} y2={56} strokeWidth={0.7} />
    </>,
    className
  );

export const CategoryIconDemolition: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <line x1={12} y1={56} x2={36} y2={20} />
      <line x1={10} y1={56} x2={14} y2={56} strokeWidth={1.2} />
      <line x1={16} y1={50} x2={18} y2={48} strokeWidth={0.5} opacity={0.3} />
      <line x1={20} y1={44} x2={22} y2={42} strokeWidth={0.5} opacity={0.3} />
      <rect x={28} y={8} width={24} height={16} rx={2} />
      <line x1={30} y1={12} x2={50} y2={12} strokeWidth={0.5} opacity={0.3} />
      <line x1={30} y1={16} x2={50} y2={16} strokeWidth={0.5} opacity={0.3} />
      <line x1={30} y1={20} x2={50} y2={20} strokeWidth={0.5} opacity={0.3} />
      <line x1={52} y1={10} x2={54} y2={8} strokeWidth={0.8} />
      <line x1={52} y1={22} x2={54} y2={24} strokeWidth={0.8} />
      <line x1={54} y1={8} x2={54} y2={24} strokeWidth={0.8} />
      <line x1={56} y1={14} x2={60} y2={12} strokeWidth={0.8} opacity={0.6} />
      <line x1={56} y1={18} x2={62} y2={18} strokeWidth={0.8} opacity={0.6} />
      <line x1={54} y1={26} x2={58} y2={30} strokeWidth={0.8} opacity={0.5} />
      <line x1={50} y1={28} x2={52} y2={32} strokeWidth={0.7} opacity={0.4} />
      <circle cx={60} cy={10} r={0.8} strokeWidth={0.6} opacity={0.5} />
      <circle cx={62} cy={22} r={0.6} strokeWidth={0.6} opacity={0.4} />
      <circle cx={56} cy={28} r={0.7} strokeWidth={0.6} opacity={0.4} />
      <path d="M54,16 L58,14 L56,16 L58,18 L54,16" strokeWidth={0.6} opacity={0.5} />
    </>,
    className
  );

export const CategoryIconSafety: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <path d="M32,4 L8,14 L8,32 Q8,50 32,60 Q56,50 56,32 L56,14 Z" />
      <path d="M32,8 L12,16 L12,32 Q12,48 32,56 Q52,48 52,32 L52,16 Z" strokeWidth={0.7} opacity={0.4} />
      <path d="M32,12 L16,18 L16,32 Q16,46 32,52 Q48,46 48,32 L48,18 Z" strokeWidth={0.5} opacity={0.2} />
      <path d="M20,32 L28,42 L44,22" strokeWidth={2} />
      <path d="M22,34 L28,40 L42,24" strokeWidth={0.6} opacity={0.3} />
      <path d="M32,6 L10,15" strokeWidth={0.5} opacity={0.3} />
      <path d="M32,6 L54,15" strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconMASTER: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <circle cx={32} cy={20} r={10} />
      <circle cx={29} cy={18} r={0.8} strokeWidth={0.7} />
      <circle cx={35} cy={18} r={0.8} strokeWidth={0.7} />
      <path d="M30,23 Q32,25 34,23" strokeWidth={0.7} />
      <path d="M20,18 Q20,8 32,6 Q44,8 44,18" />
      <line x1={18} y1={18} x2={46} y2={18} strokeWidth={1.2} />
      <path d="M16,18 Q16,16 18,16 L46,16 Q48,16 48,18" strokeWidth={0.7} />
      <path d="M22,12 Q32,8 42,12" strokeWidth={0.6} opacity={0.4} />
      <circle cx={32} cy={10} r={1} strokeWidth={0.7} />
      <path d="M14,56 L14,42 Q14,34 22,32 L26,30" />
      <path d="M50,56 L50,42 Q50,34 42,32 L38,30" />
      <line x1={28} y1={30} x2={28} y2={34} />
      <line x1={36} y1={30} x2={36} y2={34} />
      <path d="M22,36 L28,34 L32,38 L36,34 L42,36" strokeWidth={0.8} />
      <rect x={18} y={42} width={6} height={5} rx={0.3} strokeWidth={0.6} opacity={0.5} />
      <line x1={16} y1={46} x2={48} y2={46} strokeWidth={0.5} opacity={0.3} />
      <line x1={16} y1={50} x2={48} y2={50} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconCOMPANY: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={12} y={8} width={40} height={50} rx={1} />
      <rect x={10} y={6} width={44} height={4} rx={0.5} />
      <rect x={16} y={14} width={6} height={6} rx={0.5} />
      <rect x={26} y={14} width={6} height={6} rx={0.5} />
      <rect x={36} y={14} width={6} height={6} rx={0.5} />
      <line x1={19} y1={14} x2={19} y2={20} strokeWidth={0.5} />
      <line x1={16} y1={17} x2={22} y2={17} strokeWidth={0.5} />
      <line x1={29} y1={14} x2={29} y2={20} strokeWidth={0.5} />
      <line x1={26} y1={17} x2={32} y2={17} strokeWidth={0.5} />
      <line x1={39} y1={14} x2={39} y2={20} strokeWidth={0.5} />
      <line x1={36} y1={17} x2={42} y2={17} strokeWidth={0.5} />
      <rect x={16} y={26} width={6} height={6} rx={0.5} />
      <rect x={26} y={26} width={6} height={6} rx={0.5} />
      <rect x={36} y={26} width={6} height={6} rx={0.5} />
      <line x1={19} y1={26} x2={19} y2={32} strokeWidth={0.5} />
      <line x1={16} y1={29} x2={22} y2={29} strokeWidth={0.5} />
      <line x1={29} y1={26} x2={29} y2={32} strokeWidth={0.5} />
      <line x1={26} y1={29} x2={32} y2={29} strokeWidth={0.5} />
      <line x1={39} y1={26} x2={39} y2={32} strokeWidth={0.5} />
      <line x1={36} y1={29} x2={42} y2={29} strokeWidth={0.5} />
      <rect x={16} y={38} width={6} height={6} rx={0.5} />
      <rect x={36} y={38} width={6} height={6} rx={0.5} />
      <line x1={19} y1={38} x2={19} y2={44} strokeWidth={0.5} />
      <line x1={16} y1={41} x2={22} y2={41} strokeWidth={0.5} />
      <line x1={39} y1={38} x2={39} y2={44} strokeWidth={0.5} />
      <line x1={36} y1={41} x2={42} y2={41} strokeWidth={0.5} />
      <rect x={26} y={46} width={10} height={12} rx={0.5} />
      <circle cx={34} cy={52} r={0.8} strokeWidth={0.7} />
      <rect x={28} y={48} width={6} height={4} rx={0.3} strokeWidth={0.6} opacity={0.4} />
      <line x1={8} y1={58} x2={56} y2={58} strokeWidth={0.6} />
      <rect x={24} y={56} width={14} height={2} rx={0.3} strokeWidth={0.7} />
    </>,
    className
  );

export const CategoryIconSTORE: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <rect x={6} y={18} width={52} height={40} rx={1} />
      <path d="M6,18 L6,10 Q6,6 10,6 L54,6 Q58,6 58,10 L58,18" />
      <path d="M6,18 Q11,24 16,18 Q21,24 26,18 Q31,24 36,18 Q41,24 46,18 Q51,24 58,18" strokeWidth={1} />
      <path d="M8,12 Q13,18 18,12" strokeWidth={0.5} opacity={0.3} />
      <path d="M18,12 Q23,18 28,12" strokeWidth={0.5} opacity={0.3} />
      <path d="M28,12 Q33,18 38,12" strokeWidth={0.5} opacity={0.3} />
      <path d="M38,12 Q43,18 48,12" strokeWidth={0.5} opacity={0.3} />
      <path d="M48,12 Q53,18 56,12" strokeWidth={0.5} opacity={0.3} />
      <rect x={10} y={24} width={18} height={20} rx={0.5} />
      <line x1={10} y1={36} x2={28} y2={36} strokeWidth={0.6} opacity={0.4} />
      <rect x={13} y={28} width={5} height={7} rx={0.3} strokeWidth={0.7} opacity={0.5} />
      <rect x={20} y={30} width={5} height={5} rx={0.3} strokeWidth={0.7} opacity={0.5} />
      <rect x={30} y={24} width={12} height={24} rx={0.5} />
      <circle cx={40} cy={38} r={1} strokeWidth={0.7} />
      <rect x={32} y={26} width={8} height={12} rx={0.3} strokeWidth={0.6} opacity={0.4} />
      <rect x={44} y={24} width={10} height={20} rx={0.5} />
      <rect x={24} y={18} width={24} height={4} rx={0.3} strokeWidth={0.7} opacity={0.5} />
      <line x1={4} y1={58} x2={60} y2={58} strokeWidth={0.6} />
      <rect x={28} y={48} width={16} height={2} rx={0.3} strokeWidth={0.7} />
      <line x1={32} y1={50} x2={40} y2={50} strokeWidth={0.5} opacity={0.3} />
    </>,
    className
  );

export const CategoryIconNETWORK: FC<IconProps> = ({ className }) =>
  wrap(
    <>
      <line x1={16} y1={22} x2={48} y2={22} strokeDasharray="2,2" strokeWidth={0.8} />
      <line x1={16} y1={22} x2={32} y2={46} strokeDasharray="2,2" strokeWidth={0.8} />
      <line x1={48} y1={22} x2={32} y2={46} strokeDasharray="2,2" strokeWidth={0.8} />
      <path d="M16,26 Q8,26 8,18 Q8,10 16,10 Q24,10 24,18 Q24,26 16,26 L16,32 Z" />
      <circle cx={16} cy={18} r={4} />
      <circle cx={16} cy={18} r={2} strokeWidth={0.7} opacity={0.5} />
      <path d="M48,26 Q40,26 40,18 Q40,10 48,10 Q56,10 56,18 Q56,26 48,26 L48,32 Z" />
      <circle cx={48} cy={18} r={4} />
      <circle cx={48} cy={18} r={2} strokeWidth={0.7} opacity={0.5} />
      <path d="M32,50 Q24,50 24,42 Q24,34 32,34 Q40,34 40,42 Q40,50 32,50 L32,56 Z" />
      <circle cx={32} cy={42} r={4} />
      <circle cx={32} cy={42} r={2} strokeWidth={0.7} opacity={0.5} />
      <path d="M16,28 L16,32" strokeWidth={0.6} opacity={0.4} />
      <path d="M48,28 L48,32" strokeWidth={0.6} opacity={0.4} />
      <path d="M32,52 L32,56" strokeWidth={0.6} opacity={0.4} />
      <circle cx={32} cy={22} r={1.2} strokeWidth={0.7} />
      <circle cx={24} cy={34} r={1.2} strokeWidth={0.7} />
      <circle cx={40} cy={34} r={1.2} strokeWidth={0.7} />
    </>,
    className
  );

export const CATEGORY_ICON_MAP: Record<string, FC<IconProps>> = {
  /** legacy / alias */
  painting: CategoryIconPaint,
  ceiling: CategoryIconCeilings,
  doors: CategoryIconDoors,
  tiles: CategoryIconTiles,
  plumbing: CategoryIconPlumbing,
  electrical: CategoryIconElectrical,
  flooring: CategoryIconFlooring,
  paint: CategoryIconPaint,
  wallpaper: CategoryIconWallpaper,
  lighting: CategoryIconLighting,
  furniture: CategoryIconFurniture,
  kitchen: CategoryIconKitchen,
  tools: CategoryIconTools,
  handles: CategoryIconHandles,
  windows: CategoryIconWindows,
  curtains: CategoryIconCurtains,
  construction: CategoryIconConstruction,
  garden: CategoryIconGarden,
  heating: CategoryIconHeating,
  bath_sauna: CategoryIconBathSauna,
  pools: CategoryIconPools,
  textile: CategoryIconTextile,
  ceilings: CategoryIconCeilings,
  decor: CategoryIconDecor,
  gates: CategoryIconGates,
  fireplaces: CategoryIconFireplaces,
  smart_home: CategoryIconSmartHome,
  climate: CategoryIconClimate,
  design: CategoryIconDesign,
  landscape: CategoryIconLandscape,
  appraisal: CategoryIconAppraisal,
  planning: CategoryIconPlanning,
  rough: CategoryIconRough,
  engineering: CategoryIconEngineering,
  finishing: CategoryIconFinishing,
  renovation: CategoryIconRenovation,
  demolition: CategoryIconDemolition,
  safety: CategoryIconSafety,
  MASTER: CategoryIconMASTER,
  COMPANY: CategoryIconCOMPANY,
  STORE: CategoryIconSTORE,
  NETWORK: CategoryIconNETWORK,
};

export function getCategoryIcon(
  categories: string[] | undefined | null,
  partnerType?: string | null
): FC<IconProps> {
  const cats = categories?.filter(Boolean) ?? [];
  for (const raw of cats) {
    const key = String(raw).trim().toLowerCase();
    const Icon = CATEGORY_ICON_MAP[key];
    if (Icon) return Icon;
  }
  const pt = partnerType?.trim().toUpperCase();
  if (pt && CATEGORY_ICON_MAP[pt]) return CATEGORY_ICON_MAP[pt];
  return CategoryIconSTORE;
}
