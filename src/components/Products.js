import {
  Button,
  Container,
  Modal,
  Form,
  Row,
  Col,
  InputGroup,
} from "react-bootstrap";
import { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TablePagination from "@mui/material/TablePagination";
import { CircularProgress, Alert } from "@mui/material"; // keep these for loader + error
import { supabase } from "../supabaseClient";
import OverallInventory from "./overall-inventory";
import ProductInfo from "./Product-Info";
import { IoMdRefresh } from "react-icons/io";
import { LuScanBarcode } from "react-icons/lu";
import BarcodeModal from "./barcode-modal";

const Products = ({ setRender, setProduct, setID }) => {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stockModal, setStockModal] = useState(false);
  const [renderState, setRenderState ] = useState(false);
  const [barcodeModalShow, setBarcodeModalShow] = useState(false);

  // fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const getAvailabilityStatus = (quantity) => {
    if (quantity === 0) return "Out-of-stock";
    if (quantity <= 5) return "Low Stock";
    return "In-Stock";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No expiry date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(7);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddProductButton = () => {
    setRender("Add-Product");
  };

  const handleProductClick = (product) => {
    setRender("product-info");
    setProduct(product);
  };

  const refreshProducts = () => {
    fetchProducts();
  };

  const handleCheck = (productId) => {

    setID(productId); // object, not array
    setRender(renderState); // switch immediately
  };

  const handleRestock = () =>{
    setRenderState("restock");
    setStockModal(true);
  }
  const handleUnstock = () =>{
    setRenderState("unstock");
    setStockModal(true);
  }

  if (loading) {
    return (
      <>
        <OverallInventory />
        <Container
          className="bg-white mx-4 my-2 rounded p-4 d-flex justify-content-center align-items-center"
          fluid
          style={{ width: "140vh", minHeight: "400px" }}
        >
          <div className="d-flex flex-column align-items-center">
            <CircularProgress />
            <p className="mt-2">Loading products...</p>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      {/* Restock Modal (React-Bootstrap) */}
      <Modal show={stockModal} onHide={() => setStockModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Restock</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group as={Row} className="mb-3 mt-4" controlId="formProductId">
            <Form.Label column sm={3} className="text-start">
              Product ID
            </Form.Label>
            <Col sm={9}>
              <InputGroup size="sm">
                <Form.Control
                  type="text"
                  placeholder="Enter product ID"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setBarcodeModalShow(true)}
                >
                  <LuScanBarcode />
                </Button>
              </InputGroup>
            </Col>
          </Form.Group>
        </Modal.Body>

        {/* Footer with right-aligned buttons */}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setStockModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleCheck(productId)}>
            Check
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ✅ Nested Modal for Barcode */}
      <BarcodeModal
        show={barcodeModalShow}
        setBarcodeModalShow={setBarcodeModalShow}
        setProductId={setProductId}
      />

      <OverallInventory />
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
          <div className="d-flex gap-2 ms-auto">
            <Button
              className="mx-1 mt-3"
              size="sm"
              onClick={handleAddProductButton}
            >
              Add Product
            </Button>

            <Button
              className="mx-1 mt-3"
              size="sm"
              variant="outline-secondary"
              onClick={() => handleRestock()}
            >
              Restock
            </Button>
            <Button
              className="mx-1 mt-3"
              size="sm"
              variant="outline-danger"
              onClick={() => handleUnstock()}
            >
              Unstock
            </Button>
          </div>
        </div>

        {error && (
          <Alert severity="error" className="mx-3 mt-2">
            {error}
          </Alert>
        )}

        {/* Table */}
        <TableContainer
          component={Paper}
          className="my-3"
          sx={{ maxHeight: 500 }}
        >
          <Table
            stickyHeader
            sx={{ width: "100%" }}
            aria-label="products table"
          >
            <TableHead>
              <TableRow>
                <TableCell align="left">Product</TableCell>
                <TableCell align="left">Product ID</TableCell>
                <TableCell align="left">Category</TableCell>
                <TableCell align="left">Buying Price</TableCell>
                <TableCell align="left">Quantity</TableCell>
                <TableCell align="left">Unit</TableCell>
                <TableCell align="left">Expiry Date</TableCell>
                <TableCell align="left">Availability</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <div className="text-muted">
                      <p>No products found</p>
                      <Button size="sm" onClick={handleAddProductButton}>
                        Add your first product
                      </Button>
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
                        onClick={() => handleProductClick(product)}
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: "#f5f5f5",
                            transform: "scale(1.01)",
                            transition: "all 0.2s ease-in-out",
                          },
                        }}
                      >
                        <TableCell component="th" scope="row">
                          {product.product_name}
                        </TableCell>
                        <TableCell align="left">{product.product_ID}</TableCell>
                        <TableCell align="left">
                          {product.product_category || "N/A"}
                        </TableCell>
                        <TableCell align="left">
                          ₱{product.product_price?.toFixed(2)}
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
                        <TableCell
                          align="left"
                          style={{
                            color:
                              availability === "In-Stock"
                                ? "green"
                                : availability === "Low Stock"
                                ? "orange"
                                : "red",
                            fontWeight: "bold",
                          }}
                        >
                          {availability}
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {products.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[7, 10, 15]}
            component="div"
            count={products.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </Container>
    </>
  );
};

export default Products;
