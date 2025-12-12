import { useEffect, useState } from "react";
import { Container, Image, Spinner, Badge } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { FaBoxOpen } from "react-icons/fa";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const AddedStocks = () => {
  const [items, setItems] = useState([]); // [{ name, qty, img, action, source }]
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

        // 1) Logs: today's Restock or Restore entries from both sources
        // Note: This assumes logs table records actions for both pharmacy and stock room
        const { data: logs, error: logErr } = await supabase
          .from("logs")
          .select("product_name, product_quantity, product_action, created_at")
          .or("product_action.eq.Restock,product_action.eq.Restore,product_action.eq.Restock - Main Stock Room (New Batch),product_action.eq.Main Stock Room Add Product")
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString())
          .order("created_at", { ascending: false });

        if (logErr) throw logErr;

        // 2) Get product images from BOTH tables
        const { data: pharmacyProducts } = await supabase
          .from("products")
          .select("product_name, product_img");

        const { data: stockRoomProducts } = await supabase
          .from("main_stock_room_products")
          .select("product_name, product_img");

        // Combine and create image map
        const allProducts = [...(pharmacyProducts || []), ...(stockRoomProducts || [])];
        const imgMap = {};
        
        allProducts.forEach((p) => {
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

        // 3) Format logs and add source information
        const formatted = (logs || [])
          .map((l) => {
            // Determine source based on action
            let source = "pharmacy";
            let actionType = l.product_action;
            
            // Check if it's a stock room action
            if (l.product_action.includes("Main Stock Room")) {
              source = "stock_room";
              // Simplify action name for display
              if (l.product_action === "Restock - Main Stock Room (New Batch)") {
                actionType = "Restock (Stock Room)";
              } else if (l.product_action === "Main Stock Room Add Product") {
                actionType = "New Product (Stock Room)";
              }
            } else if (l.product_action === "Restore") {
              actionType = "Restore (Pharmacy)";
            }

            return {
              name: l.product_name,
              qty: l.product_quantity,
              action: actionType,
              originalAction: l.product_action,
              img: imgMap[l.product_name] || "",
              source: source,
              timestamp: new Date(l.created_at)
            };
          })
          .slice(0, 6); // Show up to 6 items (3 from each)

        setItems(formatted);
        setTotalAddedToday(formatted.length);

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
            key={`${item.source}-${item.name}-${idx}`}
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
                  <small className="text-muted ms-1" style={{ fontSize: "0.7rem" }}>
                    ({item.source === "pharmacy" ? "P" : "S"})
                  </small>
                </div>
                <small className="text-muted">
                  Added: {item.qty} units
                </small>
                <div>
                  <small className={item.source === "pharmacy" ? "text-primary" : "text-dark"}>
                    {item.action}
                  </small>
                </div>
                <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                  {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
            </div>

            {/* Right: Source indicator badge */}
            <Badge 
              bg={item.source === "pharmacy" ? "primary" : "dark"} 
              pill
              style={{ fontSize: "0.7rem" }}
            >
              {item.source === "pharmacy" ? "Pharmacy" : "Stock Room"}
            </Badge>
          </div>
        ))
      )}
      
      {/* Legend at the bottom */}
      {/* {items.length > 0 && (
        <div className="border-top pt-2 px-2">
          <small className="text-muted d-block mb-1">
            Actions: <Badge bg="primary" pill className="me-1">Restock</Badge>
            <Badge bg="success" pill className="me-1">Restore</Badge>
            <Badge bg="dark" pill>Stock Room Add</Badge>
          </small>
          <small className="text-muted d-block">
            Source: <Badge bg="primary" pill className="me-1">P = Pharmacy</Badge>
            <Badge bg="dark" pill>S = Stock Room</Badge>
          </small>
        </div>
      )} */}
    </Container>
  );
};

export default AddedStocks;