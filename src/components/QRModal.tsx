import React, { useEffect, useState } from 'react';
import { Download, Copy, Check, X, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

interface QRModalProps {
  shortUrl: string;
  qrCodeDataUrl?: string;
  shortCode: string;
  onClose: () => void;
  onCopyClick: (url: string) => void;
  copiedUrl: string | null;
}

export default function QRModal({
  shortUrl,
  qrCodeDataUrl: initialQrCodeDataUrl,
  shortCode,
  onClose,
  onCopyClick,
  copiedUrl
}: QRModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>(initialQrCodeDataUrl || '');

  // ESC key keydown listener for quick access terminations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!qrCodeDataUrl) {
      QRCode.toDataURL(shortUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 8,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Client-side QR generation failed:', err));
    }
  }, [shortUrl, qrCodeDataUrl]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#0d0d0f]/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()} // stop bubblings
        className="w-full max-w-sm bg-[#121215] border border-zinc-800 rounded p-6 shadow-2xl relative animate-scale-up"
      >
        {/* Header Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          {/* Accent icon heading */}
          <div className="p-2 bg-[#6ee7b7]/10 border border-[#6ee7b7]/20 rounded mb-2">
            <QrCode className="w-5 h-5 text-[#6ee7b7]" />
          </div>

          <p className="font-sans font-semibold text-zinc-100 text-lg">
            Vector QR Redirect
          </p>
          <p className="text-[10px] text-zinc-500 font-mono tracking-wide">
            CODE: {shortCode}
          </p>

          {/* QR Container Frame */}
          <div className="p-3 bg-zinc-100 rounded border border-zinc-300">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt={`QR Link directory - ${shortCode}`}
                className="w-48 h-48 select-none"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-zinc-500 font-mono text-xs">
                Generating Vector...
              </div>
            )}
          </div>

          <p className="font-mono text-xs text-[#6ee7b7] bg-[#6ee7b7]/5 border border-[#6ee7b7]/15 rounded px-3 py-1.5 truncate w-full max-w-[280px]">
            {shortUrl}
          </p>

          {/* Download and Copy layout grid */}
          <div className="grid grid-cols-2 gap-3 w-full pt-4">
            <button
              onClick={() => onCopyClick(shortUrl)}
              className="flex items-center justify-center space-x-1.5 border border-zinc-800 hover:border-zinc-700 bg-[#16161a] hover:text-zinc-200 text-zinc-400 font-sans py-2 rounded transition-colors text-xs cursor-pointer"
            >
              {copiedUrl === shortUrl ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              href={qrCodeDataUrl}
              download={`qr_code_${shortCode}.png`}
              className="flex items-center justify-center space-x-1.5 bg-[#6ee7b7] hover:bg-[#52cfa0] text-[#0d0d0f] font-sans font-semibold py-2 rounded transition-colors text-xs text-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
