import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  NotFoundException,
  ChecksumException,
  FormatException,
} from "@zxing/library";
// ✅ add this
import { useNavigate } from "react-router-dom";
import { Alert } from "react-bootstrap";

const QrScanner = ({ show, onHide, onScan }) => {
  const videoRef = useRef(null);
  const [qrResult, setQrResult] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const codeReader = new BrowserQRCodeReader();
    let controls;

    if (show) {
      codeReader.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, err, ctrl) => {
          controls = ctrl;
          if (result) {
            const text = result.getText();
            setQrResult(text);
            console.log("✅ QR Scanned:", text);
            if (onScan) onScan(text);

            // ✅ stop scanner and close modal after success
            if (controls) controls.stop();
            if (onHide) onHide();
          }

          if (
            err &&
            !(err instanceof NotFoundException) &&
            !(err instanceof ChecksumException) &&
            !(err instanceof FormatException)
          ) {
            console.error("QR scan error:", err);
          }
        }
      );
    }

    return () => {
      if (controls) controls.stop();
    };
  }, [show, onScan]);

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Scan QR Code</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <video
          ref={videoRef}
          style={{ width: "100%", maxWidth: "400px", borderRadius: "8px" }}
        />
        {success && (
          <Alert variant="success" className="mx-4">
            {success}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QrScanner;
