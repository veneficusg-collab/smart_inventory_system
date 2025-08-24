import React, { useState, useRef } from 'react';
import { Container, Form } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { User, Upload } from "lucide-react";
import { IoCloseOutline } from "react-icons/io5";

const AddStaff = (props) => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageChange = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    handleImageChange(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleImageChange(file);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container>
      <Modal
        {...props}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            New Staff
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Image Upload Section */}
            <Form.Group className="mb-4 text-center">
              <Form.Label>Profile Picture</Form.Label>
              <div className="d-flex flex-column align-items-center">
                {/* Circular Image Preview */}
                <div 
                  className="position-relative mb-3"
                  style={{ width: '120px', height: '120px' }}
                >
                  <div
                    className={`rounded-circle border d-flex align-items-center justify-content-center position-relative overflow-hidden ${
                      imagePreview ? 'border-primary' : 'border-secondary border-2 border-dashed'
                    }`}
                    style={{
                      width: '120px',
                      height: '120px',
                      backgroundColor: imagePreview ? 'transparent' : '#f8f9fa',
                      cursor: 'pointer'
                    }}
                    onClick={handleClickUpload}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <User size={40} className="text-secondary" />
                    )}
                  </div>
                  
                  {imagePreview && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="position-absolute rounded-circle p-1"
                      style={{
                        top: '5px',
                        right: '5px',
                        width: '25px',
                        height: '25px',
                        fontSize: '12px'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                    >
                      <IoCloseOutline className='mb-1' />
                    </Button>

                  )}
                </div>

                {/* Drag and Drop Area */}
                <div
                  className={`border rounded p-4 text-center ${
                    isDragOver ? 'border-primary bg-light' : 'border-secondary border-dashed'
                  }`}
                  style={{ 
                    width: '100%', 
                    maxWidth: '300px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleClickUpload}
                >
                  <Upload size={24} className="text-secondary mb-2" />
                  <p className="mb-1 text-secondary">
                    <strong>Click to upload</strong> or drag and drop
                  </p>
                  <p className="small text-muted mb-0">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="d-none"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Staff name</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="Enter staff name"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Position</Form.Label>
              <Form.Control required type="text" placeholder="Enter position" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control
                required
                type="tel"
                placeholder="Enter contact number"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                required
                type="email"
                placeholder="Enter email address"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                required
                type="password"
                placeholder="Enter password"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={props.onHide}>Close</Button>
          <Button variant="primary" type="submit">Add Staff</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AddStaff;