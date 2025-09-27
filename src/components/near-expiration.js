import { useEffect, useState } from "react";
import { Badge, Container, Image, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const NearExpiration = () => {
  const [items, setItems] = useState([]);
  const [imageMap, setImageMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNearExpiration = async () => {
      setLoading(true);

      // next 7 days window
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString();

      const { data, error } = await supabase
        .from("products")
        .select(
          "product_ID, product_name, product_quantity, product_expiry, product_img"
        )
        .lte("product_expiry", in7Days)
        .not("product_expiry", "is", null); // ignore null expiries

      if (error) {
        console.error("Error fetching near expiration:", error);
        setItems([]);
        setLoading(false);
        return;
      }

      const rows = data || [];

      // build image URL map (supports stored keys or full URLs)
      const map = {};
      rows.forEach((p) => {
        const key = p.product_img;
        if (!key) {
          map[p.product_ID] = "/fallback.png";
          return;
        }
        if (typeof key === "string" && key.startsWith("http")) {
          map[p.product_ID] = key;
        } else {
          const { data: pub } = supabase
            .storage
            .from(BUCKET)
            .getPublicUrl(`products/${key}`);
          map[p.product_ID] = pub?.publicUrl || "/fallback.png";
        }
      });

      setImageMap(map);

      // sort by soonest expiry first
      rows.sort(
        (a, b) => new Date(a.product_expiry) - new Date(b.product_expiry)
      );

      setItems(rows);
      setLoading(false);
    };

    fetchNearExpiration();
  }, []);

  return (
    <Container
      className="bg-white mx-3 my-4 rounded p-0"
      style={{ height: 312, width: "370px", overflowY: "auto" }}
    >
      {/* Header (same style) */}
      <div className="d-flex justify-content-between align-items-center mx-2 mb-3">
        <span className="mx-1 mt-3 d-inline-block">Near Expiration</span>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted py-3">
          No items near expiration
        </div>
      ) : (
        items.map((item) => {
          const expiryDate = new Date(item.product_expiry);
          const now = new Date();
          const isExpired = expiryDate < now;

          // days left (negative if expired)
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          return (
            <div
              key={item.product_ID + String(item.product_expiry)}
              className="d-flex align-items-center justify-content-between my-2 w-100 px-2 border-top py-1"
            >
              {/* Left: Image + Info */}
              <div className="d-flex align-items-center mt-1">
                <Image
                  src={imageMap[item.product_ID] || "/fallback.png"}
                  style={{ width: 50, height: 50, objectFit: "cover" }}
                  rounded
                  onError={(e) => (e.currentTarget.src = "/fallback.png")}
                />
                <div className="ms-2">
                  <div className="fw-bold">{item.product_name}</div>
                  <small className="text-muted">
                    Remaining: {item.product_quantity}
                  </small>
                  <div>
                    <small className="text-muted">
                      Expiry: {expiryDate.toLocaleDateString()}
                    </small>
                  </div>
                </div>
              </div>

              {/* Right: Badge */}
              <Badge bg={isExpired ? "secondary" : "danger"} pill>
                {isExpired ? "Expired" : `${daysLeft}d left`}
              </Badge>
            </div>
          );
        })
      )}
    </Container>
  );
};

export default NearExpiration;
