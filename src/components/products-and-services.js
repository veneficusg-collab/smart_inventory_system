// ProductsAndServices.jsx
import { Container, Row, Col, Button, Spinner } from "react-bootstrap";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // make sure this is configured

const ProductsAndServices = ({ onAddProduct, refreshTrigger }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch products from Supabase
  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*");

    if (error) {
      console.error("Error fetching products:", error.message);
    } else {
      // 🔹 Merge products with the same product_id
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
    }
    setLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, []);

  // 👇 Re-fetch when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchProducts();
    }
  }, [refreshTrigger]);

  return (
    <Container className="bg-white mx-2 my-2 rounded p-3" fluid>
      <h5 className="mb-3 fw-bold">Products & Services</h5>

      {loading ? (
        <div className="text-center p-3">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <Row className="g-2">
          {products.length > 0 ? (
            products.map((product) => (
              <Col
                key={product.product_ID}
                xs={6}
                sm={4}
                md={4}
                lg={4}
                xl={3}
                className="p-1"
              >
                <Button
                  variant="outline-primary"
                  className="w-100 d-flex flex-column align-items-center justify-content-center text-center"
                  style={{
                    minHeight: "70px",
                    fontSize: "0.85rem",
                    padding: "4px",
                  }}
                  onClick={() =>
                    onAddProduct({
                      product_ID: product.product_ID,
                      name: product.product_name,
                      price: product.product_price,
                    })
                  }
                  // 👇 Disable button if no stock
                  disabled={product.product_quantity <= 0}
                >
                  <span className="fw-bold">{product.product_name}</span>
                  <span className="text-muted">
                    ₱{Number(product.product_price).toFixed(2)}
                  </span>
                  <span 
                    className={`small ${product.product_quantity <= 0 ? 'text-danger' : 'text-success'}`}
                  >
                    Stock: {product.product_quantity}
                    {product.product_quantity <= 0 && " (Out of Stock)"}
                  </span>
                </Button>
              </Col>
            ))
          ) : (
            <div className="text-center text-muted">No products available</div>
          )}
        </Row>
      )}
    </Container>
  );
};

export default ProductsAndServices;