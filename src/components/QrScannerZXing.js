// QrScannerZXing.js
import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

const QrScannerZXing = ({ onResult }) => {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    scannedRef.current = false;
    const codeReader = new BrowserMultiFormatReader();

    codeReader
      .decodeFromVideoDevice(null, videoRef.current, (result, error) => {
        if (result && !scannedRef.current) {
          scannedRef.current = true;
          const code = result.getText();
          console.log("Scanned QR:", code);

          if (onResult) onResult(code);

          // stop scanner after first scan
          if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
          }
        }

        if (error && !(error.name === "NotFoundException")) {
          console.error(error);
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
      });

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  }, [onResult]);

  return <video ref={videoRef} style={{ width: "100%" }} />;
};

export default QrScannerZXing;
