import React, { useState, useEffect } from "react";
import Table from "@mui/material/Table";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TableBody from "@mui/material/TableBody";
import { Container, Row, Col, Form, Button, Image } from "react-bootstrap";
import {
  MdOutlineModeEdit,
  MdArrowBack,
  MdSave,
  MdClose,
  MdDelete,
} from "react-icons/md";
import { supabase } from "../supabaseClient";

const ProductInfo = ({ setRender, product }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [variants, setVariants] = useState([]);
  const [editedVariants, setEditedVariants] = useState([]);

  const [details, setDetails] = useState({
    unit: product.product_unit || "",
    supplier_price: product.supplier_price || 0,
    product_price: product.product_price || 0,
  });

  useEffect(() => {
    const fetchVariants = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_ID", product.product_ID)
        .order("product_expiry", { ascending: true });

      if (!error && data) {
        setVariants(data);
        setEditedVariants(data);
      }
    };

    fetchVariants();

    if (product.product_img) {
      if (product.product_img.startsWith("http")) {
        setImageUrl(product.product_img);
      } else {
        const { data } = supabase.storage
          .from("Smart-Inventory-System-(Pet Matters)")
          .getPublicUrl(`products/${product.product_img}`);
        if (data?.publicUrl) setImageUrl(data.publicUrl);
      }
    }
  }, [product]);

  const handleVariantChange = (idx, field, value) => {
    setEditedVariants((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const handleDetailsChange = (field, value) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      for (const row of editedVariants) {
        const { error } = await supabase
          .from("products")
          .update({
            product_quantity: row.product_quantity,
            product_expiry: row.product_expiry,
            product_unit: details.unit,
            supplier_price: details.supplier_price,
            product_price: details.product_price,
          })
          .eq("id", row.id);

        if (error) console.error("Update failed:", error);
      }

      setVariants(editedVariants);
      setIsEditing(false);
      alert("Product details updated.");
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleCancel = () => {
    setEditedVariants(variants);
    setDetails({
      unit: product.product_unit || "",
      supplier_price: product.supplier_price || 0,
      product_price: product.product_price || 0,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Archive and delete "${product.product_name}"?`)) return;

    try {
      for (const row of variants) {
        const archiveRecord = {
          product_name: row.product_name ?? null,
          product_code: row.product_ID ?? null,
          product_category: row.product_category ?? null,
          product_price: row.product_price ?? null,
          product_quantity: row.product_quantity ?? null,
          product_unit: row.product_unit ?? null,
          product_expiry: row.product_expiry ?? null,
          product_img: row.product_img ?? null,
          supplier_name: row.supplier_name ?? null,
          product_brand: row.product_brand ?? null,
          supplier_price: row.supplier_price ?? null,
        };

        const { error: insertError } = await supabase
          .from("archive")
          .insert([archiveRecord]);

        if (insertError) {
          alert("Failed to archive one entry. Delete cancelled.");
          return;
        }

        await supabase.from("products").delete().eq("id", row.id);
      }

      alert("All product variants archived and deleted.");
      setRender("products");
    } catch (err) {
      console.error("Unexpected delete error:", err);
    }
  };

  return (
    <Container
      fluid
      className="bg-white m-5 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      {/* Header buttons */}
      <div className="d-flex justify-content-between align-items-center mb-4 mt-3 px-2">
        <Button
          variant="outline-secondary"
          size="sm"
          className="me-3"
          onClick={() => setRender("products")}
          style={{ border: "none" }}
        >
          <MdArrowBack />
        </Button>
        <div className="d-flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline-success" size="sm" onClick={handleSave}>
                <MdSave /> Save
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={handleCancel}>
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

      {/* Overview */}
      <Row>
        <Col md={6}>
          <div className="mx-5">
            <h6>Primary Details</h6>
            <p><strong>Product ID:</strong> {product.product_ID}</p>
            <p><strong>Product Name:</strong> {product.product_name}</p>
            <p><strong>Category:</strong> {product.product_category}</p>
            <p><strong>Brand:</strong> {product.product_brand}</p>

            {/* Unit */}
            <div className="d-flex justify-content-between align-items-center my-2">
              <span>Unit</span>
              {isEditing ? (
                <Form.Control
                  type="text"
                  size="sm"
                  value={details.unit}
                  onChange={(e) => handleDetailsChange("unit", e.target.value)}
                  style={{ width: "120px" }}
                />
              ) : (
                <span>{details.unit || "—"}</span>
              )}
            </div>

            {/* Product Price */}
            <div className="d-flex justify-content-between align-items-center my-2">
              <span>Product Price</span>
              {isEditing ? (
                <Form.Control
                  type="number"
                  size="sm"
                  value={details.product_price}
                  onChange={(e) =>
                    handleDetailsChange("product_price", parseFloat(e.target.value))
                  }
                  style={{ width: "120px" }}
                />
              ) : (
                <span>₱{Number(details.product_price).toFixed(2)}</span>
              )}
            </div>
          </div>
        </Col>

        <Col md={6} className="d-flex justify-content-center">
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
        </Col>
      </Row>

      {/* Stock Entries (now shows per-variant Supplier Name & Supplier Price) */}
      <div className="mx-5 my-4">
        <h6>Stock Entries</h6>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Quantity</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Supplier Name</TableCell> {/* NEW */}
                <TableCell>Supplier Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {editedVariants.map((v, idx) => (
                <TableRow key={v.id}>
                  <TableCell>
                    {isEditing ? (
                      <Form.Control
                        type="number"
                        size="sm"
                        value={v.product_quantity}
                        onChange={(e) =>
                          handleVariantChange(idx, "product_quantity", parseInt(e.target.value))
                        }
                        style={{ width: "80px" }}
                      />
                    ) : (
                      v.product_quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Form.Control
                        type="date"
                        size="sm"
                        value={v.product_expiry || ""}
                        onChange={(e) =>
                          handleVariantChange(idx, "product_expiry", e.target.value)
                        }
                        style={{ width: "160px" }}
                      />
                    ) : v.product_expiry ? (
                      new Date(v.product_expiry).toLocaleDateString()
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {v.supplier_name || "—"}
                  </TableCell>
                  <TableCell>
                    ₱{Number(v.supplier_price ?? 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </Container>
  );
};

export default ProductInfo;
