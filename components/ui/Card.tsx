import * as React from 'react';
export function Card({children,className=''}:React.PropsWithChildren<{className?:string}>){return <div className={`glass p-4 ${className}`}>{children}</div>}
