// ProductsAndServices.jsx
import { Container, Spinner, Table, Button, Image, InputGroup, Form } from "react-bootstrap";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { IoSearch } from "react-icons/io5";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const ProductsAndServices = ({ onAddProduct, refreshTrigger }) => {
  const [products, setProducts] = useState([]);
  const [imageMap, setImageMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch products from Supabase
  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*");

    if (error) {
      console.error("Error fetching products:", error.message);
    } else {
      const merged = Object.values(
        data.reduce((acc, p) => {
          if (!acc[p.product_ID]) {
            acc[p.product_ID] = { ...p };
          } else {
            acc[p.product_ID].product_quantity += p.product_quantity;
          }
          return acc;
        }, {})
      );

      setProducts(merged);

      // build image url cache
      const map = {};
      merged.forEach((p) => {
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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchProducts();
    }
  }, [refreshTrigger]);

  // 🔍 Filtered products
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
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

  return (
    <Container className="bg-white mx-2 my-2 rounded p-3" fluid>
      {/* Title + Search */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
        <h5 className="fw-bold mb-2 mb-md-0">Products & Services</h5>
        <InputGroup style={{ maxWidth: "300px" }}>
          <InputGroup.Text style={{ background: "none", borderRight: "none" }}>
            <IoSearch size={18} color="gray" />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderLeft: "none", boxShadow: "none" }}
            size="sm"
          />
        </InputGroup>
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
                  className={product.product_quantity <= 0 ? "table-danger" : ""}
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
                  <td>{product.product_name}</td>
                  <td>{product.product_category || "—"}</td>
                  <td>{product.product_brand || "—"}</td>
                  <td>₱{Number(product.product_price).toFixed(2)}</td>
                  <td
                    className={
                      product.product_quantity <= 0 ? "text-danger fw-bold" : "text-success fw-bold"
                    }
                  >
                    {product.product_quantity <= 0
                      ? `Out of Stock`
                      : product.product_quantity}
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
                      disabled={product.product_quantity <= 0}
                      onClick={() =>
                        onAddProduct({
                          product_ID: product.product_ID,
                          name: product.product_name,
                          price: product.product_price,
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
      ) : (
        <div className="text-center text-muted">No products available</div>
      )}
    </Container>
  );
};

export default ProductsAndServices;
