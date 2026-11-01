import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Form — Personal health',description:'Your weight, nutrition and hydration. A clearer view of your progress.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},other:{'theme-color':'#214c3a'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
