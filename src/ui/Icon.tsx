import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from './theme';

export type IconName =
  | 'check' | 'plus' | 'today' | 'calendar' | 'repeat' | 'settings'
  | 'left' | 'right' | 'more' | 'close' | 'bell' | 'download' | 'upload' | 'chevronDown';

export function Icon({ name, size = 22, color = colors.ink, stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { stroke: color, strokeWidth: stroke, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'left' && <Path d="M15 5l-7 7 7 7" {...p} />}
      {name === 'right' && <Path d="M9 5l7 7-7 7" {...p} />}
      {name === 'chevronDown' && <Path d="M6 9l6 6 6-6" {...p} />}
      {name === 'today' && (
        <>
          <Circle cx={12} cy={12} r={4} {...p} />
          <Path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" {...p} />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...p} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...p} />
        </>
      )}
      {name === 'repeat' && <Path d="M4 11V9a3 3 0 013-3h12l-3-3M20 13v2a3 3 0 01-3 3H5l3 3" {...p} />}
      {name === 'settings' && (
        <>
          <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...p} />
          <Circle cx={16} cy={7} r={2} {...p} />
          <Circle cx={10} cy={17} r={2} {...p} />
        </>
      )}
      {name === 'more' && (
        <>
          <Circle cx={6} cy={12} r={1.3} fill={color} />
          <Circle cx={12} cy={12} r={1.3} fill={color} />
          <Circle cx={18} cy={12} r={1.3} fill={color} />
        </>
      )}
      {name === 'bell' && <Path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 004 0" {...p} />}
      {name === 'download' && <Path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" {...p} />}
      {name === 'upload' && <Path d="M12 16V5M7 9.5l5-5 5 5M5 20h14" {...p} />}
    </Svg>
  );
}
