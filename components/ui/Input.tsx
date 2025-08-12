'use client';
import * as React from 'react';
type Props = React.InputHTMLAttributes<HTMLInputElement>;
export function Input({ className='', ...props }: Props) {
  return <input className={`w-full glass p-2.5 outline-none ${className}`} {...props} />;
}
