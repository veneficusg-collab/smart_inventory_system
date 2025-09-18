import { useEffect, useState } from "react";
import { Badge, Image, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient"; // ✅ your Supabase client

const NearExpiration = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNearExpiration = async () => {
      setLoading(true);

      // Example: fetch items with expiration date within 7 days
      const { data, error } = await supabase
        .from("products") // <-- change to your actual table name
        .select("product_ID, product_name, product_quantity, product_expiry, product_img")
        .lte("product_expiry", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()); // next 7 days

      if (error) {
        console.error("Error fetching near expiration:", error);
      } else {
        setItems(data || []);
      }

      setLoading(false);
    };

    fetchNearExpiration();
  }, []);

  return (
    <div className="bg-white mx-3 my-4 rounded p-0" style={{ height: "270px", overflowY: "auto" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mx-2 mb-3">
        <span className="mx-1 mt-3 d-inline-block">Near Expiration</span>
        <a className="mt-3 mx-2">See All</a>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted py-3">No items near expiration</div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="d-flex align-items-center justify-content-between my-2 w-100 px-2 border-top py-1"
          >
            {/* Left: Image + Info */}
            <div className="d-flex align-items-center mt-1">
              <Image
                src={item.product_img || "/fallback.png"} // fallback if no image
                style={{ width: "50px", height: "50px" }}
                rounded
              />
              <div className="ms-2">
                <div className="fw-bold">{item.product_name}</div>
                <small className="text-muted">Remaining: {item.product_quantity} Packets</small>
              </div>
            </div>

            {/* Right: Badge */}
            <Badge bg="danger" pill>
              Expiring
            </Badge>
          </div>
        ))
      )}
    </div>
  );
};

export default NearExpiration;
