"use client";

import { QRCodeSVG } from "qrcode.react";

export function CertificateQR({ value, size = 96 }: { value: string; size?: number }) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      marginSize={0}
      aria-label="QR code for certificate verification"
    />
  );
}
