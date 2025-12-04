import {
  Container,
  Button,
  Image,
  InputGroup,
  Form,
  Modal,
  Nav,
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
  // State for both archives
  const [activeTab, setActiveTab] = useState("pharmacy");
  const [pharmacyRows, setPharmacyRows] = useState([]);
  const [mainRows, setMainRows] = useState([]);
  const [pharmacyImageMap, setPharmacyImageMap] = useState({});
  const [mainImageMap, setMainImageMap] = useState({});
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
  const [restoreTab, setRestoreTab] = useState(""); // 'pharmacy' or 'main'
  const [restoreQty, setRestoreQty] = useState("");
  const [restoreExpiry, setRestoreExpiry] = useState("");
  const [restoreSaving, setRestoreSaving] = useState(false);
  const [restoreErr, setRestoreErr] = useState("");

  // Fetch both archives
  const fetchArchives = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch pharmacy archive
      const { data: pharmacyData, error: pharmacyError } = await supabase
        .from("archive")
        .select("*")
        .order("created_at", { ascending: false });

      if (pharmacyError) throw pharmacyError;

      // Fetch main archive
      const { data: mainData, error: mainError } = await supabase
        .from("main_stock_room_archive")
        .select("*")
        .order("created_at", { ascending: false });

      if (mainError) throw mainError;

      setPharmacyRows(pharmacyData || []);
      setMainRows(mainData || []);

      // Build image url caches
      const pharmacyMap = {};
      (pharmacyData || []).forEach((r) => {
        const key = r.product_img;
        if (!key) {
          pharmacyMap[r.product_code] = "";
          return;
        }
        if (typeof key === "string" && key.startsWith("http")) {
          pharmacyMap[r.product_code] = key;
        } else {
          const { data: pub } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(`products/${key}`);
          pharmacyMap[r.product_code] = pub?.publicUrl || "";
        }
      });

      const mainMap = {};
      (mainData || []).forEach((r) => {
        const key = r.product_img;
        if (!key) {
          mainMap[r.product_code] = "";
          return;
        }
        if (typeof key === "string" && key.startsWith("http")) {
          mainMap[r.product_code] = key;
        } else {
          const { data: pub } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(`products/${key}`);
          mainMap[r.product_code] = pub?.publicUrl || "";
        }
      });

      setPharmacyImageMap(pharmacyMap);
      setMainImageMap(mainMap);
    } catch (e) {
      console.error(e);
      setError("Failed to load archives.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, []);

  const getCurrentStaffName = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const { data, error } = await supabase
          .from("staff")
          .select("staff_name, staff_barcode")
          .eq("id", user.id)
          .limit(1);

        if (!error && data && data.length > 0) {
          return data[0].staff_name;
        }
      }
    } catch (err) {
      console.warn("Supabase staff lookup failed:", err);
    }

    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.staff_name || parsed.staff_barcode || "Unknown";
      }
    } catch (err) {
      console.warn("Local storage parse failed:", err);
    }

    return "Unknown";
  };

  // Get current rows based on active tab
  const currentRows = activeTab === "pharmacy" ? pharmacyRows : mainRows;
  const currentImageMap = activeTab === "pharmacy" ? pharmacyImageMap : mainImageMap;

  const filtered = useMemo(() => {
    if (!search) return currentRows;
    const q = search.toLowerCase();
    return currentRows.filter((r) =>
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
  }, [currentRows, search]);

  const refresh = () => fetchArchives();

  // ------- Restore flow -------
  const openRestoreModal = (row, tabType) => {
    setRestoreRow(row);
    setRestoreTab(tabType);
    setRestoreErr("");
    setRestoreQty(String(row.product_quantity ?? 0));
    const d = row.product_expiry ? new Date(row.product_expiry) : null;
    const asYMD =
      d && !isNaN(d)
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(d.getDate()).padStart(2, "0")}`
        : "";
    setRestoreExpiry(asYMD);
    setShowRestore(true);
  };

  const closeRestoreModal = () => {
    if (restoreSaving) return;
    setShowRestore(false);
    setRestoreRow(null);
    setRestoreTab("");
    setRestoreQty("");
    setRestoreExpiry("");
    setRestoreErr("");
  };

  const submitRestore = async () => {
    if (!restoreRow || !restoreTab) return;
    setRestoreErr("");

    const qtyNum = parseInt(restoreQty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      setRestoreErr("Quantity must be a non-negative number.");
      return;
    }
    const expiryVal = restoreExpiry ? new Date(restoreExpiry) : null;
    if (restoreExpiry && isNaN(expiryVal)) {
      setRestoreErr("Invalid expiry date.");
      return;
    }

    setRestoreSaving(true);
    setBusyId(restoreRow.id);
    try {
      const staffName = await getCurrentStaffName();

      // Determine log action and target table based on tab
      const logAction = restoreTab === "pharmacy" ? "Restore" : "Main Stock Room Restore";
      const targetTable = restoreTab === "pharmacy" ? "products" : "main_stock_room_products";
      const sourceTable = restoreTab === "pharmacy" ? "archive" : "main_stock_room_archive";

      // 1) Log BEFORE restoring
      const logRow = {
        product_id: restoreRow.product_code,
        product_name: restoreRow.product_name ?? restoreRow.product_code,
        product_category: restoreRow.product_category ?? null,
        product_unit: restoreRow.product_unit ?? null,
        product_quantity: restoreRow.product_quantity ?? 0,
        product_expiry: restoreRow.product_expiry ?? null,
        product_action: logAction,
        staff: staffName,
      };

      const { error: logError } = await supabase.from("logs").insert([logRow]);
      if (logError) console.error("Log insert (Restore) failed:", logError);

      // 2) Insert back into appropriate products table
      const productRecord = {
        product_name: restoreRow.product_name ?? null,
        product_ID: restoreRow.product_code ?? null,
        product_category: restoreRow.product_category ?? null,
        product_price: restoreRow.product_price ?? null,
        product_quantity: qtyNum,
        product_unit: restoreRow.product_unit ?? null,
        product_expiry: restoreExpiry || null,
        product_img: restoreRow.product_img ?? null,
        supplier_name: restoreRow.supplier_name ?? null,
        supplier_price: restoreRow.supplier_price ?? null,
        product_brand: restoreRow.product_brand ?? null,
      };

      // Add main stock room specific fields
      if (restoreTab === "main") {
        productRecord.supplier_number = restoreRow.supplier_number ?? null;
        productRecord.vat = restoreRow.vat ?? null;
      }

      const { error: insertError } = await supabase
        .from(targetTable)
        .insert([productRecord]);

      if (insertError) {
        console.error("Restore insert failed:", insertError);
        setRestoreErr(insertError.message || `Failed to restore to ${targetTable}.`);
        setRestoreSaving(false);
        setBusyId(null);
        return;
      }

      // 3) Remove from appropriate archive
      const { error: deleteError } = await supabase
        .from(sourceTable)
        .delete()
        .eq("id", restoreRow.id);

      if (deleteError) {
        console.error("Archive delete after restore failed:", deleteError);
        setRestoreErr(
          `Product restored, but removing from ${sourceTable} failed. You may delete it manually.`
        );
        setRestoreSaving(false);
        setBusyId(null);
        return;
      }

      // Update appropriate state
      if (restoreTab === "pharmacy") {
        setPharmacyRows((prev) => prev.filter((r) => r.id !== restoreRow.id));
      } else {
        setMainRows((prev) => prev.filter((r) => r.id !== restoreRow.id));
      }

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

  const handleDelete = async (row, tabType) => {
    if (
      !window.confirm(
        `Permanently delete "${row.product_name}" from archive? This cannot be undone.`
      )
    )
      return;

    setBusyId(row.id);
    try {
      const staffName = await getCurrentStaffName();

      // 1) Log BEFORE delete
      const logRow = {
        product_id: row.product_code,
        product_name: row.product_name ?? row.product_code,
        product_category: row.product_category ?? null,
        product_unit: row.product_unit ?? null,
        product_quantity: row.product_quantity ?? 0,
        product_expiry: row.product_expiry ?? null,
        product_action: "Delete",
        staff: staffName,
      };

      const { error: logError } = await supabase.from("logs").insert([logRow]);
      if (logError) console.error("Log insert (Delete) failed:", logError);

      // 2) Then delete from appropriate archive
      const tableName = tabType === "pharmacy" ? "archive" : "main_stock_room_archive";
      const { error: delError } = await supabase
        .from(tableName)
        .delete()
        .eq("id", row.id);

      if (delError) {
        console.error("Permanent delete failed:", delError);
        alert("Failed to delete from archive.");
        return;
      }

      // Update appropriate state
      if (tabType === "pharmacy") {
        setPharmacyRows((prev) => prev.filter((r) => r.id !== row.id));
      } else {
        setMainRows((prev) => prev.filter((r) => r.id !== row.id));
      }

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
          <p className="mt-2">Loading archives…</p>
        </div>
      </Container>
    );
  }

  return (
    <Container
      className="bg-white mx-4 my-2 rounded p-0"
      fluid
      style={{ width: "140vh" }}
    >
      {/* Header with Refresh Button */}
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="mx-1 mt-3 d-inline-block">
          Archive
          <Button className="mx-1 mb-1" size="lg" variant="" onClick={refresh}>
            <IoMdRefresh />
          </Button>
        </span>
      </div>

      {/* Navigation Tabs */}
      <Nav variant="tabs" className="mx-3 mb-0">
        <Nav.Item style={{ flex: "1" }}>
          <Nav.Link
            active={activeTab === "pharmacy"}
            onClick={() => {
              setActiveTab("pharmacy");
              setPage(0); // Reset pagination when switching tabs
            }}
            className="cursor-pointer text-center"
            style={{
              fontSize: "0.85rem",
              padding: "10px 8px",
              whiteSpace: "nowrap",
            }}
          >
            Pharmacy Archive ({pharmacyRows.length})
          </Nav.Link>
        </Nav.Item>

        <Nav.Item style={{ flex: "1" }}>
          <Nav.Link
            active={activeTab === "main"}
            onClick={() => {
              setActiveTab("main");
              setPage(0); // Reset pagination when switching tabs
            }}
            className="cursor-pointer text-center"
            style={{
              fontSize: "0.85rem",
              padding: "10px 8px",
              whiteSpace: "nowrap",
            }}
          >
            Main Stock Room Archive ({mainRows.length})
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Search Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mx-3 mt-2">
        <div className="text-muted" style={{ fontSize: "0.9rem" }}>
          {activeTab === "pharmacy" ? "Pharmacy Archive" : "Main Stock Room Archive"} • {filtered.length} items
        </div>

        {/* Search */}
        <InputGroup style={{ maxWidth: "400px", marginTop: "8px" }}>
          <InputGroup.Text
            style={{ background: "none", borderRight: "none", paddingRight: 0 }}
          >
            <IoSearch size={18} color="gray" />
          </InputGroup.Text>
          <Form.Control
            size="sm"
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0); // Reset to first page when searching
            }}
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
      <TableContainer
        component={Paper}
        className="my-3 mx-3"
        sx={{ maxHeight: 500 }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell align="left">Image</TableCell>
              <TableCell align="left">Product</TableCell>
              <TableCell align="left">Code</TableCell>
              <TableCell align="left">Category</TableCell>
              <TableCell align="left">Supplier Price</TableCell>
              <TableCell align="left">Selling Price</TableCell>
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
                  <div className="text-muted">
                    No archived products in {activeTab === "pharmacy" ? "pharmacy" : "main stock room"} archive.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow key={`${activeTab}-${row.id}`}>
                    <TableCell sx={{ width: 64 }}>
                      {currentImageMap[row.product_code] ? (
                        <Image
                          src={currentImageMap[row.product_code]}
                          rounded
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: "cover",
                            border: "1px solid #eee",
                          }}
                          onError={(e) =>
                            (e.currentTarget.style.display = "none")
                          }
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
                    <TableCell>
                      ₱{Number(row.supplier_price ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ₱{Number(row.product_price ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{row.product_quantity}</TableCell>
                    <TableCell>{row.product_unit || "N/A"}</TableCell>
                    <TableCell>
                      {row.product_expiry
                        ? new Date(row.product_expiry).toLocaleDateString(
                            "en-US"
                          )
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
                          onClick={() => openRestoreModal(row, activeTab)}
                        >
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={busyId === row.id}
                          onClick={() => handleDelete(row, activeTab)}
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
          className="mx-3"
        />
      )}

      {/* Restore Modal */}
      <Modal show={showRestore} onHide={closeRestoreModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Restore {restoreRow ? `"${restoreRow.product_name}"` : "Product"}
            {restoreTab === "pharmacy" ? " (Pharmacy)" : " (Main Stock Room)"}
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
          <Button
            variant="secondary"
            disabled={restoreSaving}
            onClick={closeRestoreModal}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            disabled={restoreSaving}
            onClick={submitRestore}
          >
            {restoreSaving ? "Restoring..." : "Restore"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Archive;