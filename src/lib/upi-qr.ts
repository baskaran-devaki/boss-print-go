import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function buildUpiUri(upiId: string, payeeName: string, amount: number) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: "BOSS PrintGo print order",
  });
  return `upi://pay?${params.toString()}`;
}

// Client-side only (runs in an effect); never during SSR.
export function useQrDataUrl(text: string) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    if (!text) {
      setDataUrl("");
      return;
    }
    let alive = true;
    QRCode.toDataURL(text, { width: 480, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (alive) setDataUrl(url);
      })
      .catch(() => {
        if (alive) setDataUrl("");
      });
    return () => {
      alive = false;
    };
  }, [text]);
  return dataUrl;
}
