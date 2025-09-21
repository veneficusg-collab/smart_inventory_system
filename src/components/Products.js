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
import { CircularProgress, Alert } from "@mui/material";
import { supabase } from "../supabaseClient";
import OverallInventory from "./overall-inventory";
import { IoMdRefresh } from "react-icons/io";
import { LuScanBarcode } from "react-icons/lu";
import { IoIosSearch } from "react-icons/io";
import BarcodeModal from "./barcode-modal";
import { IoSearch } from "react-icons/io5";

const Products = ({ setRender, setProduct, setID, staffRole }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buttonState, setButtonState] = useState("");

  const [stockModal, setStockModal] = useState(false);
  const [renderState, setRenderState] = useState(false);
  const [barcodeModalShow, setBarcodeModalShow] = useState(false);

  // ✅ only search query remains
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(7);

  useEffect(() => {
  console.log("staffRole in Products:", staffRole);
}, [staffRole]);


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
      setFilteredProducts(data || []);
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
    setID(productId);
    setRender(renderState);
  };

  const handleRestock = () => {
    setRenderState("restock");
    setStockModal(true);
    setButtonState("Restock");
  };
  const handleUnstock = () => {
    setRenderState("unstock");
    setStockModal(true);
    setButtonState("Unstock");
  };

  // 🔍 Only search filter remains
  useEffect(() => {
    let result = [...products];

    if (searchQuery) {
      result = result.filter((p) =>
        Object.values(p)
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(result);
    setPage(0);
  }, [searchQuery, products]);

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
      {/* Restock/Unstock Modal */}
      <Modal show={stockModal} onHide={() => setStockModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{buttonState}</Modal.Title>
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
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setStockModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleCheck(productId)}>
            Check
          </Button>
        </Modal.Footer>
      </Modal>

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
        {/* Top bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mx-2">
          <span className="mx-1 mt-3 d-inline-block">
            Product Inventory ({filteredProducts.length} items){" "}
            <Button
              className="mx-1 mb-1"
              size="lg"
              variant=""
              onClick={refreshProducts}
            >
              <IoMdRefresh />
            </Button>
          </span>

          {/* 🔍 Search bar with icon */}
          <InputGroup style={{ maxWidth: "600px", marginTop: "15px" }}>
            <InputGroup.Text
              style={{
                background: "none",
                borderRight: "none",
                paddingRight: 0,
              }}
            >
              <IoSearch size={18} color="gray" />
            </InputGroup.Text>
            <Form.Control
              size="sm"
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                borderLeft: "none",
                boxShadow: "none", // 🚫 removes blue glow
                outline: "none", // 🚫 removes black outline
              }}
            />
          </InputGroup>

          {/* Action buttons */}
          {(staffRole === 'admin' || staffRole === 'super_admin') && (<div className="d-flex gap-2 ms-auto">
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
          </div>)}
          
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
          <Table stickyHeader>
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
              {filteredProducts.length === 0 ? (
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
                filteredProducts
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
                        <TableCell>{product.product_name}</TableCell>
                        <TableCell>{product.product_ID}</TableCell>
                        <TableCell>
                          {product.product_category || "N/A"}
                        </TableCell>
                        <TableCell>
                          ₱{product.product_price?.toFixed(2)}
                        </TableCell>
                        <TableCell>{product.product_quantity}</TableCell>
                        <TableCell>{product.product_unit || "N/A"}</TableCell>
                        <TableCell>
                          {formatDate(product.product_expiry)}
                        </TableCell>
                        <TableCell
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

        {filteredProducts.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[7, 10, 15]}
            component="div"
            count={filteredProducts.length}
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
