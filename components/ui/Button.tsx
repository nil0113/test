'use client';
import * as React from 'react';
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'ghost'|'danger'; size?: 'md'|'lg' };
export function Button({ variant='primary', size='md', className='', ...props }: Props) {
  const base='rounded-2xl transition focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60';
  const pad=size==='lg'?'px-6 py-3':'px-4 py-2.5';
  const style=variant==='primary'?'bg-brand-600 hover:bg-brand-500 text-white':variant==='danger'?'bg-red-600 hover:bg-red-500 text-white':'bg-white/10 hover:bg-white/20 text-white border border-white/10';
  return <button className={`${base} ${pad} ${style} ${className}`} {...props} />;
}
