import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VVRobots 19116 - Media Platform',
  description: 'Platformă de organizare poze și video pentru echipa de robotică VVRobots 19116',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
        <Providers>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} VVRobots 19116 FTC Team — Media Organization Platform
          </footer>
        </Providers>
      </body>
    </html>
  );
}
