import { Button, Container, Nav, Tab } from "react-bootstrap";
import { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TablePagination from "@mui/material/TablePagination";
import { supabase } from "../supabaseClient";
import { IoMdRefresh } from "react-icons/io";

const Logs = () => {
  useEffect(() => {
    fetchLogs();
    fetchTransactions();
  }, []);

  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("inventory");
  const [staffRole, setStaffRole] = useState("");

  // State for pagination - separate for each tab
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventoryRowsPerPage, setInventoryRowsPerPage] = useState(10);
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionRowsPerPage, setTransactionRowsPerPage] = useState(10);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");

      // Get the current logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No logged in user found");

      // Fetch staff details (name + role)
      let { data: staffRows, error: staffError } = await supabase
        .from("staff")
        .select("staff_name, staff_position")
        .eq("id", user.id)
        .single();

      setStaffRole(staffRows.staff_position);

      if (staffError) throw staffError;

      let data;
      if (
        staffRows.staff_position === "admin" ||
        staffRows.staff_position === "super_admin"
      ) {
        // Admin sees ALL logs
        ({ data } = await supabase.from("logs").select("*"));
      } else {
        // Staff sees ONLY their logs
        ({ data } = await supabase
          .from("logs")
          .select("*")
          .eq("staff", staffRows.staff_name));
      }

      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setError("Failed to load logs. Please try again.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setTransactionLoading(true);
      setError("");

      // Get the current logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No logged in user found");

      // Fetch staff details (name + role)
      let { data: staffRows, error: staffError } = await supabase
        .from("staff")
        .select("staff_name, staff_position")
        .eq("id", user.id)
        .single();

      if (staffError) throw staffError;

      let data;
      if (
        staffRows.staff_position === "admin" ||
        staffRows.staff_position === "super_admin"
      ) {
        // Admin sees ALL transactions
        ({ data } = await supabase
          .from("transactions")
          .select(
            `
            *,
            transaction_items (
              product_code,
              qty,
              price,
              subtotal
            ),
            transaction_payments (
              method,
              amount
            )
          `
          )
          .order("created_at", { ascending: false }));
      } else {
        // Staff sees ONLY their transactions
        ({ data } = await supabase
          .from("transactions")
          .select(
            `
            *,
            transaction_items (
              product_code,
              qty,
              price,
              subtotal
            ),
            transaction_payments (
              method,
              amount
            )
          `
          )
          .eq("staff", staffRows.staff_name)
          .order("created_at", { ascending: false }));
      }

      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError("Failed to load transactions. Please try again.");
      setTransactions([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  // Function to determine availability status
  const getAvailabilityStatus = (quantity) => {
    if (quantity === 0) return "Out-of-stock";
    if (quantity <= 5) return "Low Stock";
    return "In-Stock";
  };

  // Function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "No expiry date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Function to format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Handle inventory page change
  const handleInventoryPageChange = (event, newPage) => {
    setInventoryPage(newPage);
  };

  const handleInventoryRowsPerPageChange = (event) => {
    setInventoryRowsPerPage(parseInt(event.target.value, 10));
    setInventoryPage(0);
  };

  // Handle transaction page change
  const handleTransactionPageChange = (event, newPage) => {
    setTransactionPage(newPage);
  };

  const handleTransactionRowsPerPageChange = (event) => {
    setTransactionRowsPerPage(parseInt(event.target.value, 10));
    setTransactionPage(0);
  };

  const refreshData = () => {
    fetchLogs();
    fetchTransactions();
  };

  // Render inventory table
  const renderInventoryTable = () => (
    <>
      <TableContainer
        component={Paper}
        className="my-3"
        sx={{ maxHeight: "none" }}
        style={{ height: "500px" }}
      >
        <Table stickyHeader sx={{ width: "100%" }} aria-label="products table">
          <TableHead>
            <TableRow>
              <TableCell align="left">Transaction ID</TableCell>
              <TableCell align="left">Product Name</TableCell>
              <TableCell align="left">Category</TableCell>
              <TableCell align="left">Quantity</TableCell>
              <TableCell align="left">Unit</TableCell>
              <TableCell align="left">Expiry Date</TableCell>
              <TableCell align="left">Staff</TableCell>
              <TableCell align="left">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <div className="text-muted">
                    <p>{loading ? "Loading..." : "No inventory logs found"}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products
                .slice(
                  inventoryPage * inventoryRowsPerPage,
                  inventoryPage * inventoryRowsPerPage + inventoryRowsPerPage
                )
                .map((product) => (
                  <TableRow
                    key={product.id}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                        transform: "scale(1.01)",
                        transition: "all 0.2s ease-in-out",
                      },
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {product.id}
                    </TableCell>
                    <TableCell component="th" scope="row">
                      {product.product_name}
                    </TableCell>
                    <TableCell align="left">
                      {product.product_category || "N/A"}
                    </TableCell>
                    <TableCell align="left">
                      {product.product_quantity}
                    </TableCell>
                    <TableCell align="left">
                      {product.product_unit || "N/A"}
                    </TableCell>
                    <TableCell align="left">
                      {formatDate(product.product_expiry)}
                    </TableCell>
                    <TableCell align="left">{product.staff || "N/A"}</TableCell>
                    <TableCell align="left">
                      {product.product_action || "N/A"}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {products.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={products.length}
          rowsPerPage={inventoryRowsPerPage}
          page={inventoryPage}
          onPageChange={handleInventoryPageChange}
          onRowsPerPageChange={handleInventoryRowsPerPageChange}
        />
      )}
    </>
  );

  // Render transactions table
  const renderTransactionsTable = () => (
    <>
      <TableContainer
        component={Paper}
        className="my-3"
        sx={{ maxHeight: "none" }}
        style={{ height: "500px" }}
      >
        <Table
          stickyHeader
          sx={{ width: "100%" }}
          aria-label="transactions table"
        >
          <TableHead>
            <TableRow>
              <TableCell align="left">Transaction ID</TableCell>
              <TableCell align="left">Date & Time</TableCell>
              <TableCell align="left">Total Amount</TableCell>
              <TableCell align="left">Items</TableCell>
              <TableCell align="left">Payment Methods</TableCell>
              <TableCell align="left">Staff</TableCell>
              <TableCell align="left">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <div className="text-muted">
                    <p>
                      {transactionLoading
                        ? "Loading..."
                        : "No transactions found"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              transactions
                .slice(
                  transactionPage * transactionRowsPerPage,
                  transactionPage * transactionRowsPerPage +
                    transactionRowsPerPage
                )
                .map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                        transform: "scale(1.01)",
                        transition: "all 0.2s ease-in-out",
                      },
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {transaction.id}
                    </TableCell>
                    <TableCell align="left">
                      {formatDateTime(transaction.created_at)}
                    </TableCell>
                    <TableCell align="left">
                      ₱{transaction.total_amount?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell align="left">
                      <div style={{ maxWidth: "200px", overflow: "hidden" }}>
                        {transaction.transaction_items?.map((item, idx) => (
                          <div
                            key={idx}
                            style={{ fontSize: "0.8rem", lineHeight: "1.2" }}
                          >
                            {item.product_code} x{item.qty}
                          </div>
                        )) || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell align="left">
                      <div style={{ maxWidth: "150px" }}>
                        {transaction.transaction_payments?.map(
                          (payment, idx) => (
                            <div
                              key={idx}
                              style={{ fontSize: "0.8rem", lineHeight: "1.2" }}
                            >
                              {payment.method}: ₱
                              {payment.amount?.toFixed(2) || "0.00"}
                            </div>
                          )
                        ) || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell align="left">
                      {transaction.staff || "N/A"}
                    </TableCell>
                    <TableCell align="left">
                      <span
                        className={`badge ${
                          transaction.status === "completed"
                            ? "bg-success"
                            : transaction.status === "voided"
                            ? "bg-danger"
                            : "bg-warning"
                        }`}
                      >
                        {transaction.status || "unknown"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {transactions.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={transactions.length}
          rowsPerPage={transactionRowsPerPage}
          page={transactionPage}
          onPageChange={handleTransactionPageChange}
          onRowsPerPageChange={handleTransactionRowsPerPageChange}
        />
      )}
    </>
  );

  return (
    <Container
      className="bg-white mx-4 my-2 rounded p-0"
      fluid
      style={{ width: "140vh" }}
    >
      <div className="d-flex justify-content-between align-items-center mx-2">
        <span className="mx-1 mt-3 d-inline-block">
          Logs
          <Button
            className="mx-1 mb-1"
            size="lg"
            variant=""
            onClick={refreshData}
          >
            <IoMdRefresh />
          </Button>
        </span>
      </div>

      {/* Tab Navigation */}
      {staffRole === "admin" ||
        (staffRole === "super_admin" && (
          <Nav variant="tabs" className="mx-3 mb-0">
            <Nav.Item style={{ flex: "1" }}>
              <Nav.Link
                active={activeTab === "inventory"}
                onClick={() => setActiveTab("inventory")}
                className="cursor-pointer text-center"
                style={{
                  fontSize: "0.85rem",
                  padding: "10px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                Inventory ({products.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item style={{ flex: "1" }}>
              <Nav.Link
                active={activeTab === "transactions"}
                onClick={() => setActiveTab("transactions")}
                className="cursor-pointer text-center"
                style={{
                  fontSize: "0.85rem",
                  padding: "10px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                Transactions ({transactions.length})
              </Nav.Link>
            </Nav.Item>
          </Nav>
        ))}

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "inventory" && renderInventoryTable()}
        {activeTab === "transactions" && renderTransactionsTable()}
      </div>

      {error && (
        <div className="alert alert-danger mx-3 mt-3" role="alert">
          {error}
        </div>
      )}
    </Container>
  );
};

export default Logs;
