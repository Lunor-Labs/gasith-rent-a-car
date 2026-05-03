import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Gasith Rent a Car – Premium Vehicle Rental in Sri Lanka',
  description: 'Rent premium vehicles in Sri Lanka with ease. Affordable rates, reliable service, island-wide coverage.',
  keywords: 'rent a car, Sri Lanka, vehicle rental, Gasith, car hire',
  openGraph: {
    title: 'Gasith Rent a Car',
    description: 'Premium vehicle rental services in Sri Lanka',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Text fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Work+Sans:wght@600&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols icon font — no display=swap so icons don't flash as text */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        {/* Font Awesome for brand icons (WhatsApp FAB, etc.) */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className={geist.variable}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' },
              success: { iconTheme: { primary: '#F5C518', secondary: '#000' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
