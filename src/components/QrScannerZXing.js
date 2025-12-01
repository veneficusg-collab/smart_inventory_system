import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { supabase } from "../supabaseClient";

const QrScannerZXing = ({ onResult }) => {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    scannedRef.current = false;
    const codeReader = new BrowserMultiFormatReader();

    codeReader
      .decodeFromVideoDevice(null, videoRef.current, async (result, error) => {
        if (result && !scannedRef.current) {
          scannedRef.current = true;
          const qrCode = result.getText();
          console.log("Scanned QR:", qrCode);

          // Locate user by the staff_barcode in the QR code
          try {
            const { data, error: fetchError } = await supabase
              .from("staff")
              .select("*")
              .eq("staff_barcode", qrCode)
              .single();  // Get a single staff record

            if (fetchError || !data) {
              alert("Invalid QR code");
              return;
            }

            // Successfully found staff, pass it to parent via onResult
            console.log("Staff Data:", data);
            if (onResult) onResult(data); // Pass the full staff object

          } catch (err) {
            console.error("Error fetching staff:", err.message);
          }

          // Stop scanning after first scan
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
