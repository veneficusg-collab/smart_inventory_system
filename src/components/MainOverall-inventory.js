import { useEffect, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import { supabase } from "../supabaseClient"; // adjust path if needed

const MainOverallInventory = () => {
  const [categoryCount, setCategoryCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // 📌 Fetch all categories and products
      const { data: products, error } = await supabase
        .from("main_stock_room_products")
        .select("product_name, product_category");

      if (!error && products) {
        // 📌 Count unique categories
        const uniqueCategories = new Set(
          products.map((p) => p.product_category?.toLowerCase())
        );
        setCategoryCount(uniqueCategories.size);

        // 📌 Count unique (product_name + category) pairs
        const uniquePairs = new Set(
          products.map(
            (p) =>
              `${p.product_name?.toLowerCase()}-${p.product_category?.toLowerCase()}`
          )
        );
        setTotalProducts(uniquePairs.size);
      }
    };

    fetchData();
  }, []);

  return (
    <Container
      fluid
      className="bg-white m-4 rounded"
      style={{ width: "140vh" }}
    >
      <span
        className="mx-0 mt-3 mb-2 d-inline-block"
        style={{ fontWeight: "10px" }}
      >
        Overall Inventory
      </span>
      <Row>
        {/* Categories */}
        <Col md={6} className="border-end">
          <div className="d-flex flex-column align-items-start mb-4 mt-1">
            <span
              className="mx-0 m-1 d-inline-block"
              style={{ color: "blue" }}
            >
              Categories
            </span>
            <span className="mx-0 m-1 d-inline-block">{categoryCount}</span>
          </div>
        </Col>

        {/* Total Product */}
        <Col md={6} className="border-end">
          <div className="d-flex flex-column align-items-start mt-1">
            <span
              className="mx-0 m-1 d-inline-block"
              style={{ color: "#ffc60a" }}
            >
              Total Product
            </span>
            <div className="d-flex justify-content-between w-100">
              <div className="me-3">
                <div className="fw-bold">{totalProducts}</div>
              </div>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default MainOverallInventory;
