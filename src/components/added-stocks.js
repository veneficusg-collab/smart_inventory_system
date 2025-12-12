import { useEffect, useState } from "react";
import { Container, Image, Spinner, Badge } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { FaBoxOpen } from "react-icons/fa";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const AddedStocks = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAddedToday, setTotalAddedToday] = useState(0);

  useEffect(() => {
    const fetchAllAddedStocks = async () => {
      try {
        setLoading(true);

        // Today's window (local time)
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        // 1️⃣ Fetch pharmacy stock additions (from products table - items added today)
        const { data: pharmacyData, error: pharmacyError } = await supabase
          .from("products")
          .select("product_ID, product_name, product_quantity, product_img, created_at")
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString())
          .order("created_at", { ascending: false });

        if (pharmacyError) throw pharmacyError;

        // 2️⃣ Fetch main stock room additions (from main_stock_room_products table - items added today)
        const { data: stockRoomData, error: stockRoomError } = await supabase
          .from("main_stock_room_products")
          .select("product_ID, product_name, product_quantity, product_img, created_at")
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString())
          .order("created_at", { ascending: false });

        if (stockRoomError) throw stockRoomError;

        // Process pharmacy items
        const processedPharmacy = (pharmacyData || []).map((item) => {
          let imgUrl = "";
          if (item.product_img) {
            if (String(item.product_img).startsWith("http")) {
              imgUrl = item.product_img;
            } else {
              const { data: pub } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(`products/${item.product_img}`);
              imgUrl = pub?.publicUrl || "";
            }
          }
          return {
            ...item,
            imgUrl,
            source: "pharmacy",
            action: "New Product (Pharmacy)",
            timestamp: new Date(item.created_at)
          };
        });

        // Process stock room items
        const processedStockRoom = (stockRoomData || []).map((item) => {
          let imgUrl = "";
          if (item.product_img) {
            if (String(item.product_img).startsWith("http")) {
              imgUrl = item.product_img;
            } else {
              const { data: pub } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(`products/${item.product_img}`);
              imgUrl = pub?.publicUrl || "";
            }
          }
          return {
            ...item,
            imgUrl,
            source: "stock_room",
            action: "New Product (Stock Room)",
            timestamp: new Date(item.created_at)
          };
        });

        // Combine and sort by timestamp (newest first)
        const allItems = [...processedPharmacy, ...processedStockRoom]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 6); // Show up to 6 items

        setItems(allItems);
        setTotalAddedToday(allItems.length);

      } catch (err) {
        console.error("Error fetching added stocks:", err);
        setItems([]);
        setTotalAddedToday(0);
      } finally {
        setLoading(false);
      }
    };

    fetchAllAddedStocks();
    
    // Optional: Refresh every 5 minutes to show latest additions
    const interval = setInterval(fetchAllAddedStocks, 300000);
    return () => clearInterval(interval);
  }, []);

  // Count items by source
  const getSourceCounts = () => {
    const pharmacyCount = items.filter(item => item.source === "pharmacy").length;
    const stockRoomCount = items.filter(item => item.source === "stock_room").length;
    return { pharmacyCount, stockRoomCount };
  };

  const { pharmacyCount, stockRoomCount } = getSourceCounts();

  return (
    <Container
      className="bg-white mx-3 my-4 rounded p-0"
      style={{ height: 312, width: "370px", overflowY: "auto" }}
    >
      {/* Header with counts */}
      <div className="d-flex justify-content-between align-items-center mx-2 mb-2">
        <span className="mx-1 mt-3 d-inline-block">
          Added to Stock Today
          {totalAddedToday > 0 && (
            <Badge bg="success" pill className="ms-2">
              {totalAddedToday}
            </Badge>
          )}
        </span>
        
        {/* Source breakdown */}
        {totalAddedToday > 0 && (
          <div className="d-flex gap-2 me-2">
            <Badge bg="primary" pill title="Pharmacy additions">
              P: {pharmacyCount}
            </Badge>
            <Badge bg="dark" pill title="Stock room additions">
              S: {stockRoomCount}
            </Badge>
          </div>
        )}
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted py-3">No stock additions today</div>
      ) : (
        items.map((item, idx) => (
          <div
            key={`${item.source}-${item.product_ID}-${idx}`}
            className="d-flex align-items-center justify-content-between my-2 w-100 px-2 border-top py-1"
          >
            {/* Left: Image/Icon + Info */}
            <div className="d-flex align-items-center mt-1" style={{ minWidth: 0, flex: 1 }}>
              {/* Image Container */}
              <div className="position-relative" style={{ width: '45px', height: '45px', flexShrink: 0 }}>
                {item.imgUrl ? (
                  <>
                    <Image
                      src={item.imgUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                      rounded
                      onError={(e) => {
                        // Hide broken image and show the icon box
                        e.currentTarget.style.display = "none";
                        const iconBox = e.currentTarget.parentElement?.querySelector('.icon-fallback');
                        if (iconBox) iconBox.style.display = "flex";
                      }}
                    />
                    {/* Icon fallback (hidden initially) */}
                    <div
                      className="icon-fallback"
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 6,
                        background: "#f1f3f5",
                        border: "1px dashed #dee2e6",
                        display: 'none',
                        alignItems: "center",
                        justifyContent: "center",
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                    >
                      <FaBoxOpen size={18} color="#868e96" />
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 6,
                      background: "#f1f3f5",
                      border: "1px dashed #dee2e6",
                      display: 'flex',
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <FaBoxOpen size={20} color="#868e96" />
                  </div>
                )}
              </div>
              
              {/* Text Content */}
              <div className="ms-2" style={{ minWidth: 0, flex: 1 }}>
                <div 
                  className="fw-bold text-truncate" 
                  style={{ 
                    fontSize: '0.85rem',
                    lineHeight: '1.2'
                  }}
                  title={item.product_name}
                >
                  {idx + 1}. {item.product_name}
                  <small className="text-muted ms-1" style={{ fontSize: "0.65rem" }}>
                    ({item.source === "pharmacy" ? "P" : "S"})
                  </small>
                </div>
                <div 
                  className="text-muted"
                  style={{ fontSize: "0.75rem" }}
                >
                  Added: <strong>{item.product_quantity}</strong> units
                </div>
                <div>
                  <small 
                    className={item.source === "pharmacy" ? "text-primary" : "text-dark"}
                    style={{ fontSize: "0.7rem" }}
                  >
                    {item.action}
                  </small>
                </div>
                <div className="text-muted" style={{ fontSize: "0.65rem" }}>
                  {item.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
              </div>
            </div>

            {/* Right: Source indicator badge */}
            <div className="d-flex flex-column align-items-end flex-shrink-0 ms-2">
              <Badge 
                bg={item.source === "pharmacy" ? "primary" : "dark"} 
                pill
                style={{ fontSize: "0.7rem" }}
              >
                {item.source === "pharmacy" ? "Pharmacy" : "Stock Room"}
              </Badge>
              <small 
                className="text-muted mt-1" 
                style={{ fontSize: "0.65rem", whiteSpace: 'nowrap' }}
              >
                {item.timestamp.toLocaleDateString()}
              </small>
            </div>
          </div>
        ))
      )}
      
      {/* Legend at the bottom */}
      {items.length > 0 && (
        <div className="border-top pt-2 px-2">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted" style={{ fontSize: "0.75rem" }}>
              <Badge bg="primary" pill className="me-1" style={{ fontSize: "0.65rem" }}>P</Badge> Pharmacy
            </small>
            <small className="text-muted" style={{ fontSize: "0.75rem" }}>
              <Badge bg="dark" pill className="me-1" style={{ fontSize: "0.65rem" }}>S</Badge> Stock Room
            </small>
          </div>
        </div>
      )}
    </Container>
  );
};

export default AddedStocks;