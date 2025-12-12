import { useEffect, useState } from "react";
import { Badge, Container, Image, Spinner } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const LowStocks = () => {
  const [pharmacyItems, setPharmacyItems] = useState([]);
  const [stockRoomItems, setStockRoomItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalLowStockItems, setTotalLowStockItems] = useState(0);

  useEffect(() => {
    const fetchAllLowStocks = async () => {
      setLoading(true);

      try {
        // 1️⃣ Fetch pharmacy low stocks (from products table)
        const { data: pharmacyData, error: pharmacyError } = await supabase
          .from("products")
          .select("product_ID, product_name, product_quantity, product_img, source")
          .lt("product_quantity", 20)
          .order("product_quantity", { ascending: true });

        if (pharmacyError) throw pharmacyError;

        // 2️⃣ Fetch main stock room low stocks (from main_stock_room_products table)
        const { data: stockRoomData, error: stockRoomError } = await supabase
          .from("main_stock_room_products")
          .select("product_ID, product_name, product_quantity, product_img, source")
          .lt("product_quantity", 20)
          .order("product_quantity", { ascending: true });

        if (stockRoomError) throw stockRoomError;

        // Process pharmacy items with image URLs
        const processedPharmacy = (pharmacyData || []).map((p) => {
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
          return { 
            ...p, 
            imgUrl,
            source: "pharmacy"  // Explicitly set source
          };
        });

        // Process stock room items with image URLs
        const processedStockRoom = (stockRoomData || []).map((p) => {
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
          return { 
            ...p, 
            imgUrl,
            source: "stock_room"  // Explicitly set source
          };
        });

        setPharmacyItems(processedPharmacy);
        setStockRoomItems(processedStockRoom);
        
        // Calculate total items
        const total = processedPharmacy.length + processedStockRoom.length;
        setTotalLowStockItems(total);

      } catch (err) {
        console.error("Error fetching low stocks:", err);
        setPharmacyItems([]);
        setStockRoomItems([]);
        setTotalLowStockItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLowStocks();
  }, []);

  // Combine and sort all items by quantity (lowest first)
  const allItems = [...pharmacyItems, ...stockRoomItems]
    .sort((a, b) => a.product_quantity - b.product_quantity);

  return (
    <Container
      className="bg-white mx-3 my-4 rounded p-0"
      style={{ height: 312, width: "370px", overflowY: "auto" }}
    >
      {/* Header with counts */}
      <div className="d-flex justify-content-between align-items-center mx-2 mb-2">
        <span className="mx-1 mt-3 d-inline-block">
          Low Stocks 
          {totalLowStockItems > 0 && (
            <Badge bg="danger" pill className="ms-2">
              {totalLowStockItems}
            </Badge>
          )}
        </span>
        
        {/* Source breakdown */}
        {totalLowStockItems > 0 && (
          <div className="d-flex gap-2">
            <Badge bg="primary" pill title="Pharmacy low stock items">
              P: {pharmacyItems.length}
            </Badge>
            <Badge bg="dark" pill title="Stock room low stock items">
              S: {stockRoomItems.length}
            </Badge>
          </div>
        )}
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      ) : allItems.length === 0 ? (
        <div className="text-center text-muted py-3">No low stock items in pharmacy or stock room</div>
      ) : (
        allItems.map((item, idx) => {
          const isOutOfStock = item.product_quantity === 0;
          const isCritical = item.product_quantity <= 5 && item.product_quantity > 0;
          
          // Determine badge color based on stock level
          let badgeColor = "warning"; // Default for low stock (6-19)
          let badgeText = "Low";
          
          if (isOutOfStock) {
            badgeColor = "secondary";
            badgeText = "No Stock";
          } else if (isCritical) {
            badgeColor = "danger";
            badgeText = "Critical";
          }

          return (
            <div
              key={`${item.source}-${item.product_ID}-${idx}`}
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
                  <div className="fw-bold">
                    {idx + 1}. {item.product_name}
                    <small className="text-muted ms-1" style={{ fontSize: "0.7rem" }}>
                      ({item.source === "pharmacy" ? "P" : "S"})
                    </small>
                  </div>
                  <small className="text-muted">
                    Remaining: {item.product_quantity} units
                  </small>
                  {isCritical && (
                    <div className="text-danger" style={{ fontSize: "0.7rem" }}>
                      ⚠️ Critical level
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Badge with source indicator */}
              <div className="d-flex flex-column align-items-end">
                <Badge bg={badgeColor} pill>
                  {badgeText}
                </Badge>
                {/* Small source indicator */}
                <small className="text-muted mt-1" style={{ fontSize: "0.65rem" }}>
                  {item.source === "pharmacy" ? "Pharmacy" : "Stock Room"}
                </small>
              </div>
            </div>
          );
        })
      )}
      
      {/* Legend at the bottom */}
      {allItems.length > 0 && (
        <div className="border-top pt-2 px-2">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <Badge bg="danger" pill className="me-1">Critical</Badge> ≤5 units
            </small>
            <small className="text-muted">
              <Badge bg="warning" pill className="me-1">Low</Badge> 6-19 units
            </small>
          </div>
        </div>
      )}
    </Container>
  );
};

export default LowStocks;