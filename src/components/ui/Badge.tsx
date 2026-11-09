import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Color = 'gray' | 'green' | 'red' | 'orange' | 'blue' | 'yellow' | 'purple' | 'pink';

const colors: Record<Color, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  color?: Color;
}

export function Badge({ className, color = 'gray', ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colors[color],
        className
      )}
      {...props}
    />
  );
}