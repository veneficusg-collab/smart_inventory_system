import { useEffect, useState } from "react";
import { Badge, Container, Image, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const LowStocks = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLowStocks = async () => {
      setLoading(true);

      try {
        // 1️⃣ Fetch items with stock quantity < 20
        const { data, error } = await supabase
          .from("products")
          .select("product_ID, product_name, product_quantity, product_img")
          .lt("product_quantity", 20)
          .order("product_quantity", { ascending: true });

        if (error) throw error;

        // 2️⃣ Map image URLs
        const mapped = (data || []).map((p) => {
          let imgUrl = "/fallback.png";
          if (p.product_img) {
            if (String(p.product_img).startsWith("http")) {
              imgUrl = p.product_img;
            } else {
              const { data: pub } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(`products/${p.product_img}`);
              imgUrl = pub?.publicUrl || "/fallback.png";
            }
          }
          return { ...p, imgUrl };
        });

        setItems(mapped);
      } catch (err) {
        console.error("Error fetching low stocks:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLowStocks();
  }, []);

  return (
    <Container
      className="bg-white mx-3 my-4 rounded p-0"
      style={{ height: 312, width: "370px", overflowY: "auto" }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mx-2 mb-3">
        <span className="mx-1 mt-3 d-inline-block">Low Stocks</span>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted py-3">No low stock items</div>
      ) : (
        items.map((item, idx) => {
          const isOutOfStock = item.product_quantity === 0;
          return (
            <div
              key={item.product_ID}
              className="d-flex align-items-center justify-content-between my-2 w-100 px-2 border-top py-1"
            >
              {/* Left: Image + Info */}
              <div className="d-flex align-items-center mt-1">
                <Image
                  src={item.imgUrl}
                  style={{ width: 50, height: 50, objectFit: "cover" }}
                  rounded
                  onError={(e) => (e.currentTarget.src = "/fallback.png")}
                />
                <div className="ms-2">
                  <div className="fw-bold">{idx + 1}. {item.product_name}</div>
                  <small className="text-muted">
                    Remaining: {item.product_quantity} units
                  </small>
                </div>
              </div>

              {/* Right: Badge */}
              <Badge bg={isOutOfStock ? "secondary" : "danger"} pill>
                {isOutOfStock ? "No Stock" : "Low"}
              </Badge>
            </div>
          );
        })
      )}
    </Container>
  );
};

export default LowStocks;
