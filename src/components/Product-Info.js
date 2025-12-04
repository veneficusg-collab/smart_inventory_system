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
  const [staffName, setStaffName] = useState(""); // ✅ for logs

  const [details, setDetails] = useState({
    product_ID: product.product_ID || "",
    product_name: product.product_name || "",
    product_category: product.product_category || "",
    product_brand: product.product_brand || "",
    unit: product.product_unit || "",
    supplier_price: product.supplier_price || 0,
    vat: product.vat || 0,
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

  // ✅ Resolve current staff name for logs
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: s } = await supabase
            .from("staff")
            .select("staff_name")
            .eq("id", user.id)
            .single();
          if (s?.staff_name) setStaffName(s.staff_name);
        } else {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const u = JSON.parse(storedUser);
            if (u?.staff_name) setStaffName(u.staff_name);
          }
        }
      } catch {
        // ignore; leave blank => "System"
      }
    })();
  }, []);

  const handleVariantChange = (idx, field, value) => {
    setEditedVariants((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row))
    );
  };

  const handleDeleteVariant = async (idx, variantId) => {
  try {
    // First, get the variant to be deleted
    const variantToDelete = variants[idx];

    // Archive this variant before deletion
    const archiveRecord = {
      product_name: variantToDelete.product_name ?? null,
      product_code: variantToDelete.product_ID ?? null,
      product_category: variantToDelete.product_category ?? null,
      product_price: variantToDelete.product_price ?? null,
      product_quantity: variantToDelete.product_quantity ?? null,
      product_unit: variantToDelete.product_unit ?? null,
      product_expiry: variantToDelete.product_expiry ?? null,
      product_img: variantToDelete.product_img ?? null,
      supplier_name: variantToDelete.supplier_name ?? null,
      product_brand: variantToDelete.product_brand ?? null,
      supplier_price: variantToDelete.supplier_price ?? null,
      vat: variantToDelete.vat ?? null,
      supplier_number: variantToDelete.supplier_number ?? null,
    };

    // Insert into the archive table
    const { error: insertError } = await supabase
      .from("archive") // Change to your archive table name
      .insert([archiveRecord]);

    if (insertError) {
      console.error("Failed to archive record:", insertError);
      alert("Failed to archive the entry. Deletion cancelled.");
      return;
    }

    // Log the deletion action in the logs table
    const logRow = {
      product_id: variantId, // Product ID of the deleted variant
      product_name: variantToDelete.product_name || "Unknown Product", // Product name
      product_quantity: variantToDelete.product_quantity || 0, // Product quantity
      product_action: "Delete", // Action performed
      staff: staffName || "System", // Staff name who performed the action
    };

    const { error: logError } = await supabase.from("logs").insert([logRow]);
    if (logError) {
      console.error("Error logging deletion:", logError);
      // Continue even if logging fails
    }

    // Then, remove the variant from the editedVariants state
    const updatedVariants = editedVariants.filter((_, i) => i !== idx);
    setEditedVariants(updatedVariants);

    // Finally, delete the variant row from the products table
    const { error: deleteError } = await supabase
      .from("products") // Change to your relevant table
      .delete()
      .eq("id", variantId);

    if (deleteError) {
      console.error("Error deleting variant:", deleteError);
      alert("Failed to delete the variant.");
      return;
    }

    // Optionally: Inform the user
    alert("Variant archived and deleted successfully.");
  } catch (error) {
    console.error("Error during deletion:", error);
    alert("An error occurred during deletion.");
  }
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
            product_ID: details.product_ID,
            product_name: details.product_name,
            product_category: details.product_category,
            product_brand: details.product_brand,
            product_unit: details.unit,
            supplier_price: details.supplier_price,
            vat: details.vat,
            product_price: details.product_price,
            product_quantity: row.product_quantity,
            product_expiry: row.product_expiry,
            supplier_name: row.supplier_name, // Update supplier_name
            supplier_number: row.supplier_number, // Update supplier_number
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
    if (!window.confirm(`Archive and delete "${product.product_name}"?`))
      return;

    try {
      for (const row of variants) {
        // 1) Archive this variant
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

        // 2) ✅ Insert a LOG for this archived variant (product_action = "Archive")
        const logRow = {
          product_id: row.product_ID, // or product_code if your logs use that column name
          product_name: row.product_name ?? row.product_ID,
          product_category: row.product_category ?? null,
          product_unit: row.product_unit ?? null,
          product_quantity: row.product_quantity ?? 0,
          product_expiry: row.product_expiry ?? null,
          product_action: "Archive",
          staff: staffName || "System",
        };
        const { error: logErr } = await supabase.from("logs").insert([logRow]);
        if (logErr) {
          console.error("Log insert (Archive) failed:", logErr);
          // not fatal; continue
        }

        // 3) Delete the variant row
        await supabase.from("products").delete().eq("id", row.id);
      }

      alert("All product variants archived, logged, and deleted.");
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

      {/* Overview */}
      <Row>
        <Col md={6}>
          {/* Primary Details */}
          <div className="mx-5">
            <h6>Primary Details</h6>

            {/* Product ID */}
            <div className="d-flex justify-content-between align-items-center my-2">
              <span>Product ID</span>
              {isEditing ? (
                <Form.Control
                  type="text"
                  size="sm"
                  value={details.product_ID || ""}
                  onChange={(e) =>
                    handleDetailsChange("product_ID", e.target.value)
                  }
                  style={{ width: "200px" }}
                />
              ) : (
                <span>{details.product_ID || "—"}</span>
              )}
            </div>

            {/* Product Name */}
            <div className="d-flex justify-content-between align-items-center my-2">
              <span>Product Name</span>
              {isEditing ? (
                <Form.Control
                  type="text"
                  size="sm"
                  value={details.product_name || ""}
                  onChange={(e) =>
                    handleDetailsChange("product_name", e.target.value)
                  }
                  style={{ width: "200px" }}
                />
              ) : (
                <span>{details.product_name || "—"}</span>
              )}
            </div>

            {/* Category */}
            <div className="d-flex justify-content-between align-items-center my-2">
              <span>Category</span>
              {isEditing ? (
                <Form.Control
                  type="text"
                  size="sm"
                  value={details.product_category || ""}
                  onChange={(e) =>
                    handleDetailsChange("product_category", e.target.value)
                  }
                  style={{ width: "200px" }}
                />
              ) : (
                <span>{details.product_category || "—"}</span>
              )}
            </div>

            {/* Brand */}
            <div className="d-flex justify-content-between align-items-center my-2">
              <span>Brand</span>
              {isEditing ? (
                <Form.Control
                  type="text"
                  size="sm"
                  value={details.product_brand || ""}
                  onChange={(e) =>
                    handleDetailsChange("product_brand", e.target.value)
                  }
                  style={{ width: "200px" }}
                />
              ) : (
                <span>{details.product_brand || "—"}</span>
              )}
            </div>

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
                    handleDetailsChange(
                      "product_price",
                      parseFloat(e.target.value)
                    )
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
                <TableCell>Supplier Name</TableCell>
                <TableCell>Supplier #</TableCell>
                <TableCell>Supplier Price</TableCell>
                <TableCell>Vat</TableCell>
                <TableCell>Actions</TableCell> {/* New column for actions */}
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
                          handleVariantChange(
                            idx,
                            "product_quantity",
                            parseInt(e.target.value)
                          )
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
                          handleVariantChange(
                            idx,
                            "product_expiry",
                            e.target.value
                          )
                        }
                        style={{ width: "160px" }}
                      />
                    ) : v.product_expiry ? (
                      new Date(v.product_expiry).toLocaleDateString()
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Editable Supplier Name */}
                  <TableCell>
                    {isEditing ? (
                      <Form.Control
                        type="text"
                        size="sm"
                        value={v.supplier_name || ""}
                        onChange={(e) =>
                          handleVariantChange(
                            idx,
                            "supplier_name",
                            e.target.value
                          )
                        }
                        style={{ width: "160px" }}
                      />
                    ) : (
                      v.supplier_name || "—"
                    )}
                  </TableCell>

                  {/* Editable Supplier Number */}
                  <TableCell>
                    {isEditing ? (
                      <Form.Control
                        type="text"
                        size="sm"
                        value={v.supplier_number || ""}
                        onChange={(e) =>
                          handleVariantChange(
                            idx,
                            "supplier_number",
                            e.target.value
                          )
                        }
                        style={{ width: "160px" }}
                      />
                    ) : (
                      v.supplier_number || "—"
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Form.Control
                        type="number"
                        size="sm"
                        value={v.supplier_price ?? 0}
                        onChange={(e) =>
                          handleVariantChange(
                            idx,
                            "supplier_price",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "120px" }}
                      />
                    ) : (
                      `₱${Number(v.supplier_price ?? 0).toFixed(2)}`
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Form.Control
                        type="number"
                        size="sm"
                        value={v.vat ?? 0}
                        onChange={(e) =>
                          handleVariantChange(
                            idx,
                            "vat",
                            parseFloat(e.target.value)
                          )
                        }
                        style={{ width: "120px" }}
                      />
                    ) : (
                      `₱${Number(v.vat ?? 0).toFixed(2)}`
                    )}
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDeleteVariant(idx, v.id)}
                    >
                      Delete
                    </Button>
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
