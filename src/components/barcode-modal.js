import Modal from "react-bootstrap/Modal";
import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

const BarcodeModal = ({ show, setBarcodeModalShow, setProductId }) => {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const scannedRef = useRef(false); // ✅ track if we've already scanned

  useEffect(() => {
    if (!show) return;

    scannedRef.current = false; // reset each time modal opens
    const codeReader = new BrowserMultiFormatReader();

    codeReader
      .decodeFromVideoDevice(null, videoRef.current, (result, error) => {
        if (result && !scannedRef.current) {
          scannedRef.current = true; // ✅ prevent multiple triggers
          const code = result.getText();
          console.log("Scanned once:", code);

          setProductId(code);

          // stop camera before closing modal
          if (controlsRef.current) {
            controlsRef.current.stop();
            controlsRef.current = null;
          }

          setBarcodeModalShow(false);
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
  }, [show, setProductId, setBarcodeModalShow]);

  return (
    <Modal
      show={show}
      onHide={() => setBarcodeModalShow(false)}
      size="lg"
      centered
    >
      <Modal.Body>
        <video
          ref={videoRef}
          style={{ width: "100%", borderRadius: "8px", background: "#000" }}
        />
      </Modal.Body>
    </Modal>
  );
};

export default BarcodeModal;
