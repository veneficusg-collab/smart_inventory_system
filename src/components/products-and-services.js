// ProductsAndServices.jsx
import { Container, Spinner, Table, Button, Image, InputGroup, Form, Badge } from "react-bootstrap";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { IoSearch } from "react-icons/io5";
import { LuScanBarcode } from "react-icons/lu";
import BarcodeModal from "./barcode-modal";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const ProductsAndServices = ({ onAddProduct, refreshTrigger }) => {
  const [products, setProducts] = useState([]);
  const [mainStockProducts, setMainStockProducts] = useState([]);
  const [imageMap, setImageMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [barcodeModalShow, setBarcodeModalShow] = useState(false);

  // Fetch products from both tables
  const fetchProducts = async () => {
    setLoading(true);
    
    try {
      // Fetch pharmacy products
      const { data: pharmacyData, error: pharmacyError } = await supabase
        .from("products")
        .select("*");

      // Fetch main stock room products
      const { data: mainStockData, error: mainStockError } = await supabase
        .from("main_stock_room_products")
        .select("*");

      if (pharmacyError || mainStockError) {
        console.error("Error fetching products:", pharmacyError?.message || mainStockError?.message);
        return;
      }

      // Merge pharmacy products by product_ID (sum quantities)
      const mergedPharmacy = Object.values(
        pharmacyData.reduce((acc, p) => {
          if (!acc[p.product_ID]) {
            acc[p.product_ID] = { ...p, source: 'pharmacy' };
          } else {
            acc[p.product_ID].product_quantity += p.product_quantity;
          }
          return acc;
        }, {})
      );

      // Merge main stock room products by product_ID (sum quantities)
      const mergedMainStock = Object.values(
        mainStockData.reduce((acc, p) => {
          if (!acc[p.product_ID]) {
            acc[p.product_ID] = { ...p, source: 'main_stock' };
          } else {
            acc[p.product_ID].product_quantity += p.product_quantity;
          }
          return acc;
        }, {})
      );

      // Combine all unique products
      const allProductsMap = {};
      
      // Add pharmacy products
      mergedPharmacy.forEach(p => {
        allProductsMap[p.product_ID] = {
          ...p,
          pharmacy_quantity: p.product_quantity,
          main_stock_quantity: 0,
          total_quantity: p.product_quantity
        };
      });

      // Add or update with main stock products
      mergedMainStock.forEach(p => {
        if (allProductsMap[p.product_ID]) {
          allProductsMap[p.product_ID].main_stock_quantity = p.product_quantity;
          allProductsMap[p.product_ID].total_quantity += p.product_quantity;
        } else {
          allProductsMap[p.product_ID] = {
            ...p,
            pharmacy_quantity: 0,
            main_stock_quantity: p.product_quantity,
            total_quantity: p.product_quantity
          };
        }
      });

      const combinedProducts = Object.values(allProductsMap);
      setProducts(combinedProducts);
      setMainStockProducts(mergedMainStock);

      // Build image URL cache
      const map = {};
      combinedProducts.forEach((p) => {
        if (!p.product_img) {
          map[p.product_ID] = "";
          return;
        }
        if (p.product_img.startsWith("http")) {
          map[p.product_ID] = p.product_img;
        } else {
          const { data: pub } = supabase
            .storage
            .from(BUCKET)
            .getPublicUrl(`products/${p.product_img}`);
          map[p.product_ID] = pub?.publicUrl || "";
        }
      });
      setImageMap(map);
      
    } catch (error) {
      console.error("Error in fetchProducts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchProducts();
    }
  }, [refreshTrigger]);

  // Handle barcode scan result
  const handleBarcodeResult = (barcode) => {
    if (barcode) {
      setSearch(barcode);
      // Focus on the search field after setting barcode
      setTimeout(() => {
        const searchInput = document.querySelector('input[placeholder="Search..."]');
        if (searchInput) searchInput.focus();
      }, 100);
    }
    setBarcodeModalShow(false);
  };

  // 🔍 Filtered products - with barcode priority
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    
    const q = search.toLowerCase();
    
    // If search is a product ID (likely from barcode), prioritize exact match
    const exactProductIdMatch = products.find(p => 
      p.product_ID.toLowerCase() === q
    );
    
    if (exactProductIdMatch) {
      return [exactProductIdMatch];
    }
    
    // Otherwise search across all fields
    return products.filter((p) =>
      [
        p.product_name,
        p.product_brand,
        p.product_category,
        p.supplier_name,
        p.product_ID,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [products, search]);

  // Helper function to display stock with badges
  const renderStockDisplay = (product) => {
    return (
      <div className="d-flex flex-column gap-1">
        {/* Total Stock */}
        <div className="d-flex justify-content-between align-items-center">
          <span className="fw-bold">Total:</span>
          <Badge 
            bg={product.total_quantity <= 0 ? "danger" : "success"}
            className="px-2 py-1"
          >
            {product.total_quantity}
          </Badge>
        </div>
        
        {/* Pharmacy Stock */}
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">Pharmacy:</small>
          <Badge 
            bg={product.pharmacy_quantity <= 0 ? "secondary" : "info"}
            className="px-2 py-1"
          >
            {product.pharmacy_quantity}
          </Badge>
        </div>
        
        {/* Main Stock Room */}
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">Stock Room:</small>
          <Badge 
            bg={product.main_stock_quantity <= 0 ? "secondary" : "warning"}
            className="px-2 py-1"
          >
            {product.main_stock_quantity}
          </Badge>
        </div>
      </div>
    );
  };

  // Simplified stock display for table (hover tooltip)
  const renderTableStock = (product) => {
    const isOutOfStock = product.total_quantity <= 0;
    
    return (
      <div 
        className="position-relative"
        title={`Pharmacy: ${product.pharmacy_quantity} | Stock Room: ${product.main_stock_quantity}`}
      >
        <span className={isOutOfStock ? "text-danger fw-bold" : "text-success fw-bold"}>
          {isOutOfStock ? "Out of Stock" : product.total_quantity}
        </span>
        <div className="d-flex gap-1 mt-1">
          <Badge bg="info" className="px-1 py-0" style={{ fontSize: "0.7rem" }}>
            P: {product.pharmacy_quantity}
          </Badge>
          <Badge bg="warning" text="dark" className="px-1 py-0" style={{ fontSize: "0.7rem" }}>
            S: {product.main_stock_quantity}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Barcode Modal */}
      {barcodeModalShow && (
        <BarcodeModal
          show={barcodeModalShow}
          setBarcodeModalShow={setBarcodeModalShow}
          onScanResult={handleBarcodeResult}
        />
      )}

      <Container className="bg-white mx-2 my-2 rounded p-3" fluid>
        {/* Title + Search */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
          <div>
            <h5 className="fw-bold mb-2 mb-md-0">Products & Services</h5>
            <small className="text-muted">
              Showing total stock (Pharmacy + Main Stock Room)
            </small>
          </div>
          
          {/* Search with barcode button */}
          <InputGroup style={{ maxWidth: "400px" }}>
            <InputGroup.Text style={{ background: "none", borderRight: "none" }}>
              <IoSearch size={18} color="gray" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name, ID, or scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderLeft: "none", boxShadow: "none" }}
              size="sm"
            />
            <Button
              variant="outline-secondary"
              onClick={() => setBarcodeModalShow(true)}
              title="Scan barcode"
            >
              <LuScanBarcode size={18} />
            </Button>
          </InputGroup>
        </div>

        {/* Barcode hint */}
        {search && filteredProducts.length === 1 && (
          <div className="alert alert-info mb-3 py-2 d-flex align-items-center">
            <small>
              📷 Showing product <strong>{filteredProducts[0].product_ID}</strong> 
              - scanned via barcode
            </small>
            <Button 
              variant="link" 
              size="sm" 
              className="ms-auto p-0"
              onClick={() => setSearch("")}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Stock Legend */}
        <div className="d-flex gap-3 mb-3 flex-wrap">
          <div className="d-flex align-items-center gap-1">
            <Badge bg="info" className="px-2 py-1">P</Badge>
            <small>Pharmacy Stock</small>
          </div>
          <div className="d-flex align-items-center gap-1">
            <Badge bg="warning" text="dark" className="px-2 py-1">S</Badge>
            <small>Main Stock Room</small>
          </div>
          <div className="d-flex align-items-center gap-1">
            <Badge bg="success" className="px-2 py-1">T</Badge>
            <small>Total Stock</small>
          </div>
          <div className="d-flex align-items-center gap-1 ms-auto">
            <small className="text-muted">
              <LuScanBarcode size={16} className="me-1" />
              Use barcode scanner to search
            </small>
          </div>
        </div>

        {loading ? (
          <div className="text-center p-3">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div style={{ maxHeight: 330, overflowY: "auto" }}>
            <Table striped bordered hover responsive size="sm" className="align-middle">
              <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Price (₱)</th>
                  <th>Stock</th>
                  <th>Expiry</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.product_ID}
                    className={product.total_quantity <= 0 ? "table-danger" : ""}
                  >
                    <td style={{ width: "70px" }}>
                      {imageMap[product.product_ID] ? (
                        <Image
                          src={imageMap[product.product_ID]}
                          rounded
                          style={{
                            width: "50px",
                            height: "50px",
                            objectFit: "cover",
                            border: "1px solid #ccc",
                          }}
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      ) : (
                        <div
                          style={{
                            width: 50,
                            height: 50,
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
                    </td>
                    <td>
                      <div>
                        {product.product_name}
                        <div className="text-muted small">{product.product_ID}</div>
                      </div>
                    </td>
                    <td>{product.product_category || "—"}</td>
                    <td>{product.product_brand || "—"}</td>
                    <td>₱{Number(product.product_price).toFixed(2)}</td>
                    <td>
                      {renderTableStock(product)}
                    </td>
                    <td>
                      {product.product_expiry
                        ? new Date(product.product_expiry).toLocaleDateString("en-US")
                        : "—"}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={product.total_quantity <= 0}
                        onClick={() =>
                          onAddProduct({
                            product_ID: product.product_ID,
                            name: product.product_name,
                            price: product.product_price,
                            available_quantity: Math.min(product.pharmacy_quantity, product.total_quantity)
                          })
                        }
                      >
                        Add
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : search ? (
          <div className="text-center text-muted py-5">
            <p>No products found for "{search}"</p>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => setSearch("")}
            >
              Clear search
            </Button>
          </div>
        ) : (
          <div className="text-center text-muted">No products available</div>
        )}
      </Container>
    </>
  );
};

export default ProductsAndServices;