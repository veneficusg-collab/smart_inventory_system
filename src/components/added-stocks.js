import { useEffect, useState } from "react";
import { Container, Image, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { FaBoxOpen } from "react-icons/fa";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const AddedStocks = () => {
  const [items, setItems] = useState([]); // [{ name, qty, img, action }]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAddedStocks = async () => {
      try {
        setLoading(true);

        // Today's window (local time)
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        // 1) Logs: today's Restock or Restore entries
        const { data: logs, error: logErr } = await supabase
          .from("logs")
          .select("product_name, product_quantity, product_action, created_at")
          .or("product_action.eq.Restock,product_action.eq.Restore")
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString())
          .order("created_at", { ascending: false });

        if (logErr) throw logErr;

        // 2) Product images map (by product_name)
        const { data: products } = await supabase
          .from("products")
          .select("product_name, product_img");

        const imgMap = {};
        (products || []).forEach((p) => {
          const key = p.product_img;
          if (!key) {
            imgMap[p.product_name] = ""; // mark as missing
          } else if (String(key).startsWith("http")) {
            imgMap[p.product_name] = key;
          } else {
            const { data: pub } = supabase
              .storage
              .from(BUCKET)
              .getPublicUrl(`products/${key}`);
            imgMap[p.product_name] = pub?.publicUrl || "";
          }
        });

        // 3) Format (limit to top 3 most recent)
        const formatted =
          (logs || [])
            .slice(0, 3)
            .map((l) => ({
              name: l.product_name,
              qty: l.product_quantity,
              action: l.product_action, // "Restock" or "Restore"
              img: imgMap[l.product_name] || "", // empty string => no image
            })) || [];

        setItems(formatted);
      } catch (err) {
        console.error("Error fetching added stocks:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAddedStocks();
  }, []);

  return (
    <Container
      className="bg-white mx-3 my-4 rounded p-0"
      style={{ height: 312, width: "370px", overflowY: "auto" }}
    >
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mx-2 mb-3">
        <span className="mx-1 mt-3 d-inline-block">Added to Stock Today</span>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted py-3">No additions today</div>
      ) : (
        items.map((item, idx) => (
          <div
            key={`${item.name}-${idx}`}
            className="d-flex align-items-center justify-content-between my-2 w-100 px-2 border-top py-1"
          >
            {/* Left: Image/Icon + Info */}
            <div className="d-flex align-items-center mt-1">
              {item.img ? (
                <Image
                  src={item.img}
                  style={{ width: 50, height: 50, objectFit: "cover" }}
                  rounded
                  onError={(e) => {
                    // Hide broken image and show the icon box
                    e.currentTarget.style.display = "none";
                    const sib = e.currentTarget.nextElementSibling;
                    if (sib) sib.style.display = "flex";
                  }}
                />
              ) : null}

              {/* Icon fallback box (hidden if image rendered successfully) */}
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 6,
                  background: "#f1f3f5",
                  border: "1px dashed #dee2e6",
                  display: item.img ? "none" : "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FaBoxOpen size={20} color="#868e96" />
              </div>

              <div className="ms-2">
                <div className="fw-bold">
                  {idx + 1}. {item.name}
                </div>
                <small className="text-muted">
                  Restocked: {item.qty}
                </small>
              </div>
            </div>
          </div>
        ))
      )}
    </Container>
  );
};

export default AddedStocks;
