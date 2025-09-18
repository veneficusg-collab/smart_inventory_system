import { Button, Container } from "react-bootstrap";
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
  }, []);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");

      // ✅ Get the current logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No logged in user found");

      // ✅ Fetch staff details (name + role)
      let { data: staffRows, error: staffError } = await supabase
        .from("staff")
        .select("staff_name, staff_position") // make sure you have a `role` column
        .eq("id", user.id)
        .single();

      if (staffError) throw staffError;

      let data;
      if (staffRows.staff_position === "admin" || staffRows.staff_position === "super_admin") {
        // ✅ Admin sees ALL logs
        ({ data } = await supabase.from("logs").select("*"));
      } else {
        // ✅ Staff sees ONLY their logs
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

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const refreshProducts = () => {
    fetchLogs();
  };
  return (
    <>
      <Container
        className="bg-white mx-4 my-2 rounded p-0"
        fluid
        style={{ width: "140vh" }}
      >
        <div className="d-flex justify-content-between align-items-center mx-2">
          <span className="mx-1 mt-3 d-inline-block">
            Product Inventory ({products.length} items){" "}
            <Button
              className="mx-1 mb-1"
              size="lg"
              variant=""
              onClick={refreshProducts}
            >
              <IoMdRefresh />
            </Button>
          </span>
          <div className="d-flex gap-2 ms-auto"></div>
        </div>

        <div>
          <TableContainer
            component={Paper}
            className="my-3"
            sx={{ maxHeight: "none" }}
            style={{ height: "585px" }}
          >
            <Table
              stickyHeader
              sx={{ width: "100%" }}
              aria-label="products table"
            >
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
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <div className="text-muted">
                        <p>No products found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((product) => {
                      const availability = getAvailabilityStatus(
                        product.product_quantity
                      );
                      return (
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
                          <TableCell align="left">
                            {product.staff || "N/A"}
                          </TableCell>
                          <TableCell align="left">
                            {product.product_action || "N/A"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}

                {/* Empty rows filler to maintain height */}
                {products.length > 0 &&
                  products.length < (page + 1) * rowsPerPage &&
                  Array.from(
                    Array(
                      rowsPerPage -
                        Math.min(
                          rowsPerPage,
                          products.length - page * rowsPerPage
                        )
                    )
                  ).map((_, i) => (
                    <TableRow key={`empty-${i}`} style={{ height: 53 }}>
                      <TableCell colSpan={9} />
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Control - only show if there are products */}
          {products.length > 0 && (
            <TablePagination
              rowsPerPageOptions={[10]}
              component="div"
              count={products.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </div>
      </Container>
    </>
  );
};

export default Logs;
