import {
  Container,
  Button,
  Image,
  InputGroup,
  Form,
  Modal,             // ⬅️ added
} from "react-bootstrap";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import { CircularProgress, Alert } from "@mui/material";
import { IoMdRefresh } from "react-icons/io";
import { IoSearch } from "react-icons/io5";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const Archive = () => {
  const [rows, setRows] = useState([]);
  const [imageMap, setImageMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Restore modal state
  const [showRestore, setShowRestore] = useState(false);
  const [restoreRow, setRestoreRow] = useState(null);
  const [restoreQty, setRestoreQty] = useState("");
  const [restoreExpiry, setRestoreExpiry] = useState("");
  const [restoreSaving, setRestoreSaving] = useState(false);
  const [restoreErr, setRestoreErr] = useState("");

  const fetchArchive = async () => {
    try {
      setLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("archive")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRows(data || []);

      // build image url cache
      const map = {};
      (data || []).forEach((r) => {
        const key = r.product_img;
        if (!key) {
          map[r.product_code] = "";
          return;
        }
        if (typeof key === "string" && key.startsWith("http")) {
          map[r.product_code] = key;
        } else {
          const { data: pub } = supabase
            .storage
            .from(BUCKET)
            .getPublicUrl(`products/${key}`);
          map[r.product_code] = pub?.publicUrl || "";
        }
      });
      setImageMap(map);
    } catch (e) {
      console.error(e);
      setError("Failed to load archive.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      [
        r.product_name,
        r.product_code,
        r.product_category,
        r.product_brand,
        r.supplier_name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const refresh = () => fetchArchive();

  // ------- Restore flow -------
  const openRestoreModal = (row) => {
    setRestoreRow(row);
    setRestoreErr("");
    setRestoreQty(String(row.product_quantity ?? 0));
    // If there's an existing expiry date, normalize to YYYY-MM-DD for date input
    const d = row.product_expiry ? new Date(row.product_expiry) : null;
    const asYMD =
      d && !isNaN(d)
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate()
          ).padStart(2, "0")}`
        : "";
    setRestoreExpiry(asYMD);
    setShowRestore(true);
  };

  const closeRestoreModal = () => {
    if (restoreSaving) return;
    setShowRestore(false);
    setRestoreRow(null);
    setRestoreQty("");
    setRestoreExpiry("");
    setRestoreErr("");
  };

  const submitRestore = async () => {
    if (!restoreRow) return;
    setRestoreErr("");

    // Basic validation
    const qtyNum = parseInt(restoreQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setRestoreErr("Quantity must be a non-negative number.");
      return;
    }
    // allow empty expiry (no expiry)
    const expiryVal = restoreExpiry ? new Date(restoreExpiry) : null;
    if (restoreExpiry && isNaN(expiryVal)) {
      setRestoreErr("Invalid expiry date.");
      return;
    }

    setRestoreSaving(true);
    setBusyId(restoreRow.id);
    try {
      // 1) Insert back into products with overrides
      const productRecord = {
        product_name: restoreRow.product_name ?? null,
        product_ID: restoreRow.product_code ?? null,
        product_category: restoreRow.product_category ?? null,
        product_price: restoreRow.product_price ?? null, // selling/buying price column in your schema
        product_quantity: qtyNum,
        product_unit: restoreRow.product_unit ?? null,
        product_expiry: restoreExpiry || null, // keep YYYY-MM-DD string
        product_img: restoreRow.product_img ?? null,
        supplier_name: restoreRow.supplier_name ?? null,
        supplier_price: restoreRow.supplier_price ?? null,
        product_brand: restoreRow.product_brand ?? null,
      };

      const { error: insertError } = await supabase
        .from("products")
        .insert([productRecord]);

      if (insertError) {
        console.error("Restore insert failed:", insertError);
        setRestoreErr(insertError.message || "Failed to restore to products.");
        setRestoreSaving(false);
        setBusyId(null);
        return;
      }

      // 2) Remove from archive
      const { error: deleteError } = await supabase
        .from("archive")
        .delete()
        .eq("id", restoreRow.id);

      if (deleteError) {
        console.error("Archive delete after restore failed:", deleteError);
        setRestoreErr(
          "Product restored, but removing from archive failed. You may delete it manually."
        );
        setRestoreSaving(false);
        setBusyId(null);
        return;
      }

      // optimistic UI
      setRows((prev) => prev.filter((r) => r.id !== restoreRow.id));
      closeRestoreModal();
      alert("Product restored successfully.");
    } catch (e) {
      console.error(e);
      setRestoreErr("Something went wrong while restoring.");
    } finally {
      setRestoreSaving(false);
      setBusyId(null);
    }
  };

  // ------- Permanent delete -------
  const handleDelete = async (row) => {
    if (
      !window.confirm(
        `Permanently delete "${row.product_name}" from archive? This cannot be undone.`
      )
    )
      return;

    setBusyId(row.id);
    try {
      const { error: delError } = await supabase
        .from("archive")
        .delete()
        .eq("id", row.id);

      if (delError) {
        console.error("Permanent delete failed:", delError);
        alert("Failed to delete from archive.");
        return;
      }

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      alert("Archived record deleted.");
    } catch (e) {
      console.error(e);
      alert("Something went wrong while deleting.");
    } finally {
      setBusyId(null);
    }
  };

  // ------- UI -------
  if (loading) {
    return (
      <Container
        className="bg-white mx-4 my-2 rounded p-4 d-flex justify-content-center align-items-center"
        fluid
        style={{ width: "140vh", minHeight: "400px" }}
      >
        <div className="d-flex flex-column align-items-center">
          <CircularProgress />
          <p className="mt-2">Loading archive…</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="bg-white mx-4 my-2 rounded p-0" fluid style={{ width: "140vh" }}>
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mx-2">
        <span className="mx-1 mt-3 d-inline-block">
          Archive ({filtered.length} items)
          <Button className="mx-1 mb-1" size="lg" variant="" onClick={refresh}>
            <IoMdRefresh />
          </Button>
        </span>

        {/* Search */}
        <InputGroup style={{ maxWidth: "600px", marginTop: "15px" }}>
          <InputGroup.Text
            style={{ background: "none", borderRight: "none", paddingRight: 0 }}
          >
            <IoSearch size={18} color="gray" />
          </InputGroup.Text>
          <Form.Control
            size="sm"
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderLeft: "none", boxShadow: "none", outline: "none" }}
          />
        </InputGroup>
      </div>

      {error && (
        <Alert severity="error" className="mx-3 mt-2">
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper} className="my-3" sx={{ maxHeight: 500 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell align="left">Image</TableCell>
              <TableCell align="left">Product</TableCell>
              <TableCell align="left">Code</TableCell>
              <TableCell align="left">Category</TableCell>
              <TableCell align="left">Supplier Price</TableCell>
              <TableCell align="left">Buying/Selling Price</TableCell>
              <TableCell align="left">Qty</TableCell>
              <TableCell align="left">Unit</TableCell>
              <TableCell align="left">Expiry</TableCell>
              <TableCell align="left">Archived At</TableCell>
              <TableCell align="left">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                  <div className="text-muted">No archived products.</div>
                </TableCell>
              </TableRow>
            ) : (
              filtered
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow key={row.id}>
                    <TableCell sx={{ width: 64 }}>
                      {imageMap[row.product_code] ? (
                        <Image
                          src={imageMap[row.product_code]}
                          rounded
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: "cover",
                            border: "1px solid #eee",
                          }}
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 6,
                            background: "#f1f3f5",
                            border: "1px dashed #dee2e6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            color: "#868e96",
                          }}
                        >
                          No Image
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell>{row.product_code}</TableCell>
                    <TableCell>{row.product_category || "N/A"}</TableCell>
                    <TableCell>₱{Number(row.supplier_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell>₱{Number(row.product_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{row.product_quantity}</TableCell>
                    <TableCell>{row.product_unit || "N/A"}</TableCell>
                    <TableCell>
                      {row.product_expiry
                        ? new Date(row.product_expiry).toLocaleDateString("en-US")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString("en-US")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={busyId === row.id}
                          onClick={() => openRestoreModal(row)}
                        >
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={busyId === row.id}
                          onClick={() => handleDelete(row)}
                        >
                          {busyId === row.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {filtered.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[25]}
          component="div"
          count={filtered.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      )}

      {/* Restore Modal */}
      <Modal show={showRestore} onHide={closeRestoreModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Restore {restoreRow ? `"${restoreRow.product_name}"` : "Product"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="restoreQty">
              <Form.Label>Quantity</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={restoreQty}
                onChange={(e) => setRestoreQty(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-1" controlId="restoreExpiry">
              <Form.Label>Expiry Date</Form.Label>
              <Form.Control
                type="date"
                value={restoreExpiry}
                onChange={(e) => setRestoreExpiry(e.target.value)}
              />
            </Form.Group>
            {restoreErr && (
              <div className="mt-2">
                <Alert severity="error">{restoreErr}</Alert>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" disabled={restoreSaving} onClick={closeRestoreModal}>
            Cancel
          </Button>
          <Button variant="success" disabled={restoreSaving} onClick={submitRestore}>
            {restoreSaving ? "Restoring..." : "Restore"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Archive;
