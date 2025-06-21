'use client';

import QRScanner from '../../components/qr-scanner';

export default function ScanningPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center w-full  bg-gradient-to-b from-[#0d0221] via-[#22055d] to-[#0D001D] p-4 sm:p-6">
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
