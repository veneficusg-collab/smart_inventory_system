import { useEffect, useState } from "react";
import { Badge, Container, Image, Spinner, ButtonGroup, Button } from "react-bootstrap";
import { supabase } from "../supabaseClient";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const NearExpiration = () => {
  const [items, setItems] = useState([]);
  const [imageMap, setImageMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState(6); // Default to 6 months
  const [totalExpiringItems, setTotalExpiringItems] = useState(0);

  useEffect(() => {
    const fetchAllNearExpiration = async () => {
      setLoading(true);

      // Calculate expiration threshold based on selected months
      const daysInSelectedMonths = selectedMonths * 30.4375; // average days in a month
      const millisecondsInSelectedMonths = daysInSelectedMonths * 24 * 60 * 60 * 1000;
      const thresholdDate = new Date(Date.now() + millisecondsInSelectedMonths).toISOString();

      try {
        // 1️⃣ Fetch pharmacy items near expiration
        const { data: pharmacyData, error: pharmacyError } = await supabase
          .from("products")
          .select("product_ID, product_name, product_quantity, product_expiry, product_img")
          .lte("product_expiry", thresholdDate)
          .not("product_expiry", "is", null); // ignore null expiries

        if (pharmacyError) throw pharmacyError;

        // 2️⃣ Fetch main stock room items near expiration
        const { data: stockRoomData, error: stockRoomError } = await supabase
          .from("main_stock_room_products")
          .select("product_ID, product_name, product_quantity, product_expiry, product_img")
          .lte("product_expiry", thresholdDate)
          .not("product_expiry", "is", null); // ignore null expiries

        if (stockRoomError) throw stockRoomError;

        // Combine both data sources
        const pharmacyRows = pharmacyData || [];
        const stockRoomRows = stockRoomData || [];
        
        // Add source information to each item
        const pharmacyWithSource = pharmacyRows.map(item => ({
          ...item,
          source: "pharmacy"
        }));
        
        const stockRoomWithSource = stockRoomRows.map(item => ({
          ...item,
          source: "stock_room"
        }));

        const allItems = [...pharmacyWithSource, ...stockRoomWithSource];

        // Build image URL map for all items
        const map = {};
        allItems.forEach((p) => {
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

        // Sort all items by soonest expiry first
        allItems.sort(
          (a, b) => new Date(a.product_expiry) - new Date(b.product_expiry)
        );

        setItems(allItems);
        setTotalExpiringItems(allItems.length);

      } catch (err) {
        console.error("Error fetching near expiration:", err);
        setItems([]);
        setTotalExpiringItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchAllNearExpiration();
  }, [selectedMonths]); // Re-fetch when selectedMonths changes

  const handleMonthsChange = (months) => {
    setSelectedMonths(months);
  };

  const getExpiryLabel = (daysLeft) => {
    if (daysLeft <= 0) return "Expired";
    if (daysLeft <= 30) return "Expires within 1 month";
    if (daysLeft <= 60) return "Expires within 2 months";
    if (daysLeft <= 90) return "Expires within 3 months";
    if (daysLeft <= 180) return "Expires within 6 months";
    return "Expires later";
  };

  // Get badge color based on days left
  const getBadgeColor = (daysLeft) => {
    if (daysLeft <= 0) return "secondary"; // Expired
    if (daysLeft <= 7) return "danger";    // Within 1 week (critical)
    if (daysLeft <= 30) return "warning";  // Within 1 month
    if (daysLeft <= 60) return "info";     // Within 2 months
    return "primary";                      // More than 2 months
  };

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
      {/* Header with filter buttons and counts */}
      <div className="d-flex justify-content-between align-items-center mx-2 mb-2">
        <span className="mx-1 mt-3 d-inline-block">
          Near Expiration within
          {totalExpiringItems > 0 && (
            <Badge bg="danger" pill className="ms-2">
              {totalExpiringItems}
            </Badge>
          )}
        </span>
        
        {/* Source breakdown */}
        {totalExpiringItems > 0 && (
          <div className="d-flex gap-2 me-2">
            <Badge bg="primary" pill title="Pharmacy expiring items">
              P: {pharmacyCount}
            </Badge>
            <Badge bg="dark" pill title="Stock room expiring items">
              S: {stockRoomCount}
            </Badge>
          </div>
        )}
      </div>

      {/* Month filter buttons */}
      <div className="d-flex justify-content-center mb-2">
        <ButtonGroup size="sm">
          <Button
            variant={selectedMonths === 3 ? "primary" : "outline-primary"}
            onClick={() => handleMonthsChange(3)}
          >
            3 Months
          </Button>
          <Button
            variant={selectedMonths === 6 ? "primary" : "outline-primary"}
            onClick={() => handleMonthsChange(6)}
          >
            6 Months
          </Button>
        </ButtonGroup>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <Spinner animation="border" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted py-3">
          No items near expiration in pharmacy or stock room
        </div>
      ) : (
        items.map((item, idx) => {
          const expiryDate = new Date(item.product_expiry);
          const now = new Date();
          const isExpired = expiryDate < now;

          // days left (negative if expired)
          const daysLeft = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          const badgeColor = getBadgeColor(daysLeft);
          const badgeText = isExpired ? "Expired" : `${daysLeft}d left`;

          return (
            <div
              key={`${item.source}-${item.product_ID}-${idx}`}
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
                  <div className="fw-bold">
                    {idx + 1}. {item.product_name}
                    <small className="text-muted ms-1" style={{ fontSize: "0.7rem" }}>
                      ({item.source === "pharmacy" ? "P" : "S"})
                    </small>
                  </div>
                  <small className="text-muted">
                    Qty: {item.product_quantity} | Expiry: {expiryDate.toLocaleDateString()}
                  </small>
                  <div>
                    <small className="text-muted">
                      {getExpiryLabel(daysLeft)}
                    </small>
                  </div>
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
      

    </Container>
  );
};

export default NearExpiration;