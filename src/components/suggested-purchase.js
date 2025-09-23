import { useEffect, useState } from "react";
import { Container, Image, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const SuggestedPurchase = () => {
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      setLoading(true);

      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);

      // 1️⃣ Fetch completed transactions
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
        setLoading(false);
        return;
      }

      // 2️⃣ Fetch products with images
      const { data: products } = await supabase
        .from("products")
        .select("product_ID, product_name, product_img");

      const productMap = {};
      products?.forEach((p) => {
        productMap[p.product_ID] = {
          name: p.product_name,
          img: p.product_img,
        };
      });

      // 3️⃣ Count sales
      const salesCount = {};
      transactions.forEach((t) =>
        t.transaction_items?.forEach((item) => {
          const qty = item.qty || 1;
          const product = productMap[item.product_code] || {
            name: item.product_code,
            img: "/fallback.png",
          };

          if (!salesCount[product.name]) {
            salesCount[product.name] = {
              qty: 0,
              img: product.img,
            };
          }
          salesCount[product.name].qty += qty;
        })
      );

      if (Object.keys(salesCount).length === 0) {
        setTopProducts([]);
        setLoading(false);
        return;
      }

      // 4️⃣ Sort top 3
      const sorted = Object.entries(salesCount)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 3)
        .map(([name, info]) => ({
          name,
          qty: info.qty,
          img: info.img || "/fallback.png",
        }));

      setTopProducts(sorted);
      setLoading(false);
    };

    fetchTopProducts();
  }, []);

  return (
    <Container
      className="bg-white mx-3 my-4 rounded p-0"
      style={{ height: "270px", width:"370px", overflowY: "auto" }} // ✅ same as NearExpiration
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mx-2 mb-3">
        <span className="mx-1 mt-3 d-inline-block">
          Suggested Purchases (Last 7 Days)
        </span>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      ) : topProducts.length === 0 ? (
        <div className="text-center text-muted py-3">
          No completed transactions in the last 7 days
        </div>
      ) : (
        topProducts.map((item, idx) => (
          <div
            key={idx}
            className="d-flex align-items-center justify-content-between my-2 w-100 px-2 border-top py-1"
          >
            {/* Left: Image + Info */}
            <div className="d-flex align-items-center mt-1">
              <Image
                src={item.img || "/fallback.png"}
                style={{ width: "50px", height: "50px" }}
                rounded
              />
              <div className="ms-2">
                <div
                  className="fw-bold"
                  style={{ fontWeight: idx === 0 ? "bold" : "normal" }}
                >
                  {idx + 1}. {item.name}
                </div>
                <small className="text-muted">Sold: {item.qty}</small>
              </div>
            </div>
          </div>
        ))
      )}
    </Container>
  );
};

export default SuggestedPurchase;
