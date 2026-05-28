import QRCode from 'qrcode';

/**
 * Generates a Base64 encoded PNG Data URI for a given URL string.
 */
export async function generateQrCode(url: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('QR code generation failed:', error);
    throw new Error('Failed to generate QR Code image.');
  }
}
