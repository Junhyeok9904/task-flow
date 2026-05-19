import React from 'react';
import { icons } from '../../icons/svgs';

export type IconName = keyof typeof icons;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: 'sm' | 'md' | 'lg' | number;
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
};

export const Icon = ({ name, size = 'md', className = '', ...props }: IconProps) => {
  const SvgIcon = icons[name];
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];

  if (!SvgIcon) {
    console.warn(`[Icon System] Icon "${name}" not found.`);
    return null;
  }

  return (
    <SvgIcon 
      width={pixelSize} 
      height={pixelSize} 
      className={`shrink-0 ${className}`} 
      aria-hidden={!props['aria-label']}
      {...props} 
    />
  );
};
