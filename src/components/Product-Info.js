import React, { useState, useEffect } from "react";
import Table from "@mui/material/Table";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Container, Row, Col, Form, Button, Image } from "react-bootstrap";
import {
  MdOutlineModeEdit,
  MdArrowBack,
  MdSave,
  MdClose,
  MdDelete,
} from "react-icons/md";
import TableBody from "@mui/material/TableBody";
import { supabase } from "../supabaseClient";
import logo from "../petfood.webp";

// Initialize Supabase client

const ProductInfo = ({ setRender, product, onUpdateProduct }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [editedProduct, setEditedProduct] = useState({
    product_name: product.product_name || "",
    product_category: product.product_category || "",
    product_quantity: product.product_quantity || "",
    product_expiry: product.product_expiry || "",
    supplier_name: product.supplier_name || "",
    supplier_number: product.supplier_number || "",
    product_img: product.product_img || "",
  });

  useEffect(() => {
    if (product.product_img) {
      // If it's already a full URL, just use it
      console.log("product_img from DB:", product.product_img);

      if (product.product_img.startsWith("http")) {
        setImageUrl(product.product_img);
      } else {
        const { data } = supabase.storage
          .from("Smart-Inventory-System-(Pet Matters)")
          .getPublicUrl(`products/${product.product_img}`);
        if (data?.publicUrl) {
          setImageUrl(data.publicUrl);
        }
      }
    }
  }, [product]);

  const handleInputChange = (field, value) => {
    setEditedProduct((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    // Call the parent component's update function if provided
    console.log(editedProduct);

    const { data, error } = await supabase
      .from("products")
      .update({
        product_name: editedProduct.product_name,
        product_category: editedProduct.product_category,
        product_price: editedProduct.product_price,
        product_quantity: editedProduct.product_quantity,
        supplier_name: editedProduct.supplier_name,
        supplier_number: editedProduct.supplier_number,
        product_img: editedProduct.product_img,
      })
      .eq("product_ID", product.product_ID)
      .select();
    console.log(data);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset edited product to original values
    setEditedProduct({
      product_name: product.product_name || "",
      product_category: product.product_category || "",
      product_quantity: product.product_quantity || "",
      product_expiry: product.product_expiry || "",
      supplier_name: product.supplier_name || "",
      supplier_number: product.supplier_number || "",
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      `Archive and delete "${product.product_name}"?`
    );
    if (!confirmDelete) return;

    try {
      // 1) Build archive payload from current product
      const archiveRecord = {
        // created_at will be set by DB default if present
        product_name: product.product_name ?? null,
        product_code: product.product_ID ?? null, // <-- map to archive.product_code
        product_category: product.product_category ?? null,
        product_price: product.product_price ?? null,
        product_quantity: product.product_quantity ?? null,
        product_unit: product.product_unit ?? null,
        product_expiry: product.product_expiry ?? null,
        product_img: product.product_img ?? null,
        supplier_name: product.supplier_name ?? null,
        product_brand: product.product_brand ?? null,
        supplier_price: product.supplier_price ?? null,
      };

      // 2) Insert into archive FIRST
      const { error: insertError } = await supabase
        .from("archive")
        .insert([archiveRecord]);

      if (insertError) {
        console.error("Archive insert failed:", insertError);
        alert("Failed to archive product. Delete cancelled.");
        return; // Do not proceed to delete if archive failed
      }

      // 3) Delete from products ONLY after successful archive
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("product_ID", product.product_ID);

      if (deleteError) {
        console.error("Product delete failed:", deleteError);
        alert(
          "Product was archived, but deleting from products failed. Please try again."
        );
        return;
      }

      alert("Product archived and deleted successfully.");
      setRender("products"); // go back to product list
    } catch (err) {
      console.error("Unexpected delete error:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  const displayProduct = isEditing ? editedProduct : product;

  return (
    <Container
      fluid
      className="bg-white m-5 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4 mt-3 px-2">
        <div className="d-flex align-items-center">
          <Button
            variant="outline-secondary"
            size="sm"
            className="me-3"
            onClick={() => setRender("products")}
            style={{ border: "none" }}
          >
            <MdArrowBack />
          </Button>
        </div>
        {/* Edit/Save/Cancel/Delete buttons */}
        <div className="d-flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline-success" size="sm" onClick={handleSave}>
                <MdSave /> Save
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleCancel}
              >
                <MdClose /> Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <MdOutlineModeEdit /> Edit
              </Button>
              <Button variant="outline-danger" size="sm" onClick={handleDelete}>
                <MdDelete /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div>
        <span className="mx-2 border-bottom border-primary border-1">
          Overview
        </span>
        <hr style={{ marginTop: "-2px" }} className="mx-2"></hr>
      </div>

      <Row>
        <Col md={6}>
          <span className="mx-5" style={{ fontWeight: "bold" }}>
            Primary Details
          </span>

          {/* Product ID */}
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product ID</span>
            <span>{product.product_ID}</span>
          </div>

          {/* Product Name */}
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product name</span>
            {isEditing ? (
              <Form.Control
                type="text"
                value={editedProduct.product_name}
                onChange={(e) =>
                  handleInputChange("product_name", e.target.value)
                }
                style={{ width: "200px" }}
                size="sm"
              />
            ) : (
              <span>{displayProduct.product_name}</span>
            )}
          </div>

          {/* Product Category */}
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product Category</span>
            {isEditing ? (
              <Form.Select
                value={editedProduct.product_category}
                onChange={(e) =>
                  handleInputChange("product_category", e.target.value)
                }
                style={{ width: "200px" }}
                size="sm"
              >
                <option value="">Select Category</option>
                <option value="Pet Food">Pet Food</option>
                <option value="Pet Accessories">Pet Accessories</option>
                <option value="Pet Toys">Pet Toys</option>
                <option value="Pet Medicine">Pet Medicine</option>
                <option value="Pet Grooming">Pet Grooming</option>
              </Form.Select>
            ) : (
              <span>{displayProduct.product_category}</span>
            )}
          </div>

          {/* Product Quantity */}
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product Quantity</span>
            {isEditing ? (
              <Form.Control
                type="number"
                value={editedProduct.product_quantity}
                onChange={(e) =>
                  handleInputChange("product_quantity", e.target.value)
                }
                style={{ width: "200px" }}
                size="sm"
                min="0"
              />
            ) : (
              <span>{displayProduct.product_quantity}</span>
            )}
          </div>

          {/* Expiry Date */}
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Expiry Date</span>
            {isEditing ? (
              <Form.Control
                type="date"
                value={editedProduct.product_expiry}
                onChange={(e) =>
                  handleInputChange("product_expiry", e.target.value)
                }
                style={{ width: "200px" }}
                size="sm"
              />
            ) : (
              <span>{displayProduct.product_expiry}</span>
            )}
          </div>

          <div className="mt-5 mx-5">
            <span>Supplier Details</span>
          </div>

          {/* Supplier Name */}
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Supplier Name</span>
            {isEditing ? (
              <Form.Control
                type="text"
                value={editedProduct.supplier_name}
                onChange={(e) =>
                  handleInputChange("supplier_name", e.target.value)
                }
                style={{ width: "200px" }}
                size="sm"
              />
            ) : (
              <span>{displayProduct.supplier_name}</span>
            )}
          </div>

          {/* Contact Number */}
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Contact Number</span>
            {isEditing ? (
              <Form.Control
                type="tel"
                value={editedProduct.supplier_number}
                onChange={(e) =>
                  handleInputChange("supplier_number", e.target.value)
                }
                style={{ width: "200px" }}
                size="sm"
              />
            ) : (
              <span>{displayProduct.supplier_number}</span>
            )}
          </div>
        </Col>

        <Col md={6}>
          <div className="mx-5 d-flex justify-content-center ">
            <div
              className="mt-3 border rounded d-flex align-items-center justify-content-center"
              style={{
                height: "200px",
                width: "200px",
                backgroundColor: "#f8f9fa",
                border: "2px dashed #dee2e6",
              }}
            >
              {imageUrl ? (
                <Image src={imageUrl} style={{ height: "180px" }} />
              ) : (
                <span className="text-muted">No Image</span>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ProductInfo;
