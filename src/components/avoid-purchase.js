import { useEffect, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { FaBoxOpen } from "react-icons/fa"; // different icon for "avoid buying"
import { supabase } from "../supabaseClient";

const AvoidPurchase = () => {
  const [lowProducts, setLowProducts] = useState([]);

  useEffect(() => {
    const fetchLowProducts = async () => {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);

      // 1️⃣ Fetch completed transactions in last 7 days
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          created_at,
          status,
          transaction_items (
            product_code,
            qty
          )
          `
        )
        .eq("status", "completed")
        .gte("created_at", lastWeek.toISOString());

      if (error) {
        console.error("Error fetching transactions:", error);
        return;
      }

      // 2️⃣ Fetch products separately
      const { data: products } = await supabase
        .from("products")
        .select("product_ID, product_name");

      const productMap = {};
      products?.forEach((p) => {
        productMap[p.product_ID] = p.product_name;
      });

      // 3️⃣ Initialize all products with 0 sales
      const salesCount = {};
      products?.forEach((p) => {
        salesCount[p.product_name] = 0;
      });

      // 4️⃣ Count actual sales
      transactions.forEach((t) =>
        t.transaction_items?.forEach((item) => {
          const qty = item.qty || 1;
          const name = productMap[item.product_code] || item.product_code;
          salesCount[name] = (salesCount[name] || 0) + qty;
        })
      );

      if (Object.keys(salesCount).length === 0) {
        setLowProducts(["No products available"]);
        return;
      }

      // 5️⃣ Sort ascending and take bottom 3
      const sorted = Object.entries(salesCount)
        .sort((a, b) => a[1] - b[1]) // ascending
        .slice(0, 3);

      setLowProducts(sorted.map(([name, qty]) => `${name} (Sold: ${qty})`));
    };

    fetchLowProducts();
  }, []);

  return (
    <Container
      className="bg-white m-4 rounded text-center"
      style={{ width: "360px" }}
    >
      <span className="mx-0 mt-3 mb-2 d-inline-block" style={{ fontWeight: "10px" }}>
        Avoid Purchases
      </span>
      <Row>
        <Col md={12} className="border-end">
          <div className="d-flex flex-column align-items-center my-4">
            <FaBoxOpen />
            {lowProducts.length > 0 ? (
              lowProducts.map((p, idx) => (
                <span
                  key={idx}
                  className="mx-0 m-1 d-inline-block"
                  style={{ fontWeight: idx === 0 ? "bold" : "normal" }}
                >
                  {idx + 1}. {p}
                </span>
              ))
            ) : (
              <span>Loading...</span>
            )}
            <span className="mx-0 mt-2 d-inline-block">
              Lowest Selling Products (Last 7 Days)
            </span>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default AvoidPurchase;
