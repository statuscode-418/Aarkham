'use client';

import { useRequireAuth, useQRValidation } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut } from 'lucide-react';
import QRScanner from '../../components/qr-scanner';

export default function ScanningPage() {
  const { isAuthenticated, isLoading, logout } = useRequireAuth();
  const { isQRValidated } = useQRValidation();
  const router = useRouter();

  // Redirect to home if QR is already validated
  useEffect(() => {
    if (isAuthenticated && isQRValidated) {
      console.log('Scanning page: QR already validated, redirecting to home');
      // Small delay to ensure state is properly set
      const timer = setTimeout(() => {
        router.replace('/home');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isQRValidated, router]);

  // Show loading while checking authentication or if already validated
  if (isLoading || !isAuthenticated || isQRValidated) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>
            {isLoading ? 'Checking authentication...' : 
             isQRValidated ? 'Redirecting to home...' : 
             'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center w-full  bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] p-4 sm:p-6">
      {/* Logout Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 border border-red-600/50 rounded-lg transition-all duration-200"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-white mb-4 text-center">QR Code Scanner</h1>
        <p className="text-gray-400 text-center mb-8">Upload a QR code image to scan</p>

        <div className="bg-[#0D001D] backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700">
          <QRScanner />
        </div>
      </div>
    </div>
  );
}
