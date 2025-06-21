'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserMultiFormatReader } from '@zxing/library';
import { validateQRCode } from '../utils/qr-validitor';

const QRScanner = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [validationTime, setValidationTime] = useState<number | null>(null);

  const processImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const startTime = performance.now();
      const codeReader = new BrowserMultiFormatReader();
      const imageUrl = URL.createObjectURL(file);
      const scanResult = await codeReader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);
      
      const qrText = scanResult.getText();
      const validationResult = await validateQRCode(qrText);
      const endTime = performance.now();
      setValidationTime(endTime - startTime);
      
      setResult(validationResult.message);
      
      if (validationResult.success) {
        // Show success message for 3 seconds before redirecting
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        setError(validationResult.message);
      }
    } catch (err: any) {
      setError('No QR code found in the image. Please try another image.');
      console.error('QR code reading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processImage(file);
  };

  return (
    <div className="w-full space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-8
          ${isDragging ? 'border-blue-500 bg-blue-50/10' : 'border-gray-400'}
          ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
          transition-colors duration-200
        `}
      >
        <label className="flex flex-col items-center space-y-4 text-center">
          <div className="p-4 bg-gray-700/50 rounded-full">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-white">
            <p className="font-semibold">Drop your QR code image here</p>
            <p className="text-sm text-gray-400 mt-1">or click to select a file</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </label>
      </div>

      {isLoading && (
        <div className="text-center text-blue-200 flex items-center justify-center space-x-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          <span>Processing image...</span>
        </div>
      )}

      {result && !error && (
        <div className="mt-6 p-4 bg-green-500/20 border border-green-500 rounded-lg">
          <h3 className="text-green-200 font-semibold mb-2">Validation Result:</h3>
          <div className="bg-gray-900/50 p-3 rounded-lg">
            <p className="text-green-100 break-all font-mono text-sm">{result}</p>
          </div>
          {validationTime && (
            <p className="text-green-200 text-sm mt-2">
              Validation completed in {validationTime.toFixed(2)}ms
            </p>
          )}
          <p className="text-green-200 mt-2">Redirecting to dashboard...</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-100">
          {error}
        </div>
      )}
    </div>
  );
};

export default QRScanner;