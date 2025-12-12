import { useEffect, useState, useMemo } from "react";
import { Container, Spinner, Row, Col, Badge } from "react-bootstrap";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { FaChartLine, FaShoppingCart, FaBoxOpen } from "react-icons/fa";
import { supabase } from "../supabaseClient";

const MainTotalSalesPerYear = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [salesData, setSalesData] = useState({
    pharmacy: 0,
    mainStockRoom: 0,
    total: 0,
    itemCount: 0
  });
  const [loading, setLoading] = useState(true);

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleYearSelect = (y) => {
    setYear(y);
    handleMenuClose();
  };

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => now - i);
  }, []);

  useEffect(() => {
    fetchTotalSalesValue(year);
    
    const channel = supabase
      .channel('sales-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => fetchTotalSalesValue(year)
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'main_stock_room_products' },
        () => fetchTotalSalesValue(year)
      )
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [year]);

  const fetchTotalSalesValue = async (selectedYear) => {
    setLoading(true);
    try {
      const { data: sellingPrices, error: priceError } = await supabase
        .from("main_stock_room_products")
        .select("product_ID, product_price");
      
      if (priceError) throw priceError;

      const priceMap = {};
      sellingPrices.forEach((p) => {
        priceMap[p.product_ID] = Number(p.product_price ?? 0);
      });

      const { data: pharmacyItems, error: pharmacyError } = await supabase
        .from("products")
        .select("product_ID, product_quantity");
      
      if (pharmacyError) throw pharmacyError;

      const { data: stockRoomItems, error: stockRoomError } = await supabase
        .from("main_stock_room_products")
        .select("product_ID, product_quantity");
      
      if (stockRoomError) throw stockRoomError;

      let pharmacySalesValue = 0;
      let mainStockRoomSalesValue = 0;
      let totalItems = 0;

      pharmacyItems.forEach((item) => {
        const sellPrice = priceMap[item.product_ID] ?? 0;
        const qty = Number(item.product_quantity ?? 0);
        pharmacySalesValue += sellPrice * qty;
        totalItems += qty;
      });

      stockRoomItems.forEach((item) => {
        const sellPrice = priceMap[item.product_ID] ?? 0;
        const qty = Number(item.product_quantity ?? 0);
        mainStockRoomSalesValue += sellPrice * qty;
        totalItems += qty;
      });

      const totalSalesValue = pharmacySalesValue + mainStockRoomSalesValue;

      setSalesData({
        pharmacy: pharmacySalesValue,
        mainStockRoom: mainStockRoomSalesValue,
        total: totalSalesValue,
        itemCount: totalItems
      });

    } catch (err) {
      console.error("Error fetching total sales value:", err);
      setSalesData({
        pharmacy: 0,
        mainStockRoom: 0,
        total: 0,
        itemCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === 0) return "₱0.00";
    
    if (value >= 1000000) {
      return `₱${value.toLocaleString("en-PH", { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
    } else if (value >= 1000) {
      return `₱${value.toLocaleString("en-PH", { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
    } else {
      return `₱${value.toLocaleString("en-PH", { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
  };

  const formatCompactCurrency = (value) => {
    if (value === 0) return "₱0";
    
    if (value >= 1000000) {
      return `₱${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `₱${(value / 1000).toFixed(1)}K`;
    } else {
      return `₱${value.toFixed(2)}`;
    }
  };

  return (
    <Container className="bg-white rounded p-3 m-3 m-md-4 shadow-sm" style={{ minHeight: "180px" }}>
      {/* Header Row - COMPLETELY FIXED */}
      <div className="d-flex justify-content-between align-items-center mb-2 mb-md-3">
        {/* Left: Title with Icon - ALWAYS FULL TEXT */}
        <div className="d-flex align-items-center flex-shrink-0" style={{ maxWidth: "70%" }}>
          <FaChartLine size={20} className="text-success me-2 flex-shrink-0" />
          <h6 className="mb-0 fw-bold text-nowrap">
            Good as Sold
          </h6>
        </div>
        
        {/* Right: Year Button - ALWAYS COMPACT */}
        <div className="flex-shrink-0">
          <Button
            variant="outlined"
            onClick={handleMenuOpen}
            sx={{
              borderColor: "#6c757d !important",
              color: "#6c757d",
              "&:hover": { borderColor: "#495057 !important", color: "#495057" },
              minWidth: "auto",
              padding: "4px 8px",
              fontSize: "0.75rem"
            }}
            size="small"
          >
            <CiCalendar className="me-1" />
            <span className="d-none d-sm-inline">{year}</span>
            <span className="d-inline d-sm-none">{year.toString().slice(2)}</span>
          </Button>
          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            {yearOptions.map((y) => (
              <MenuItem
                key={y}
                selected={y === year}
                onClick={() => handleYearSelect(y)}
              >
                {y}
              </MenuItem>
            ))}
          </Menu>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-3">
          <Spinner animation="border" size="sm" />
        </div>
      ) : (
        <>
          <div className="mb-2 mb-md-3">
            <h4 className="fw-bold text-success mb-0" style={{ 
              fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
              lineHeight: 1.2 
            }}>
              <span className="d-none d-md-inline">
                {formatCurrency(salesData.total)}
              </span>
              <span className="d-inline d-md-none">
                {formatCompactCurrency(salesData.total)}
              </span>
            </h4>
          </div>
          
          <Row className="g-2 mb-2">
            <Col xs={6}>
              <div className="d-flex align-items-center mb-1">
                <FaShoppingCart size={14} className="text-primary me-1 flex-shrink-0" />
                <small className="text-muted text-nowrap">Pharmacy:</small>
              </div>
              <div className="fw-bold text-nowrap" style={{ 
                fontSize: "clamp(0.75rem, 2vw, 0.9rem)" 
              }}>
                <span className="d-none d-sm-inline">
                  {formatCurrency(salesData.pharmacy)}
                </span>
                <span className="d-inline d-sm-none">
                  {formatCompactCurrency(salesData.pharmacy)}
                </span>
              </div>
            </Col>
            <Col xs={6}>
              <div className="d-flex align-items-center mb-1">
                <FaBoxOpen size={14} className="text-dark me-1 flex-shrink-0" />
                <small className="text-muted text-nowrap">Main Stock:</small>
              </div>
              <div className="fw-bold text-nowrap" style={{ 
                fontSize: "clamp(0.75rem, 2vw, 0.9rem)" 
              }}>
                <span className="d-none d-sm-inline">
                  {formatCurrency(salesData.mainStockRoom)}
                </span>
                <span className="d-inline d-sm-none">
                  {formatCompactCurrency(salesData.mainStockRoom)}
                </span>
              </div>
            </Col>
          </Row>
          
          <div className="pt-2 border-top">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted text-nowrap">
                Sellable Items: 
              </small>
              <Badge bg="success" pill>
                {salesData.itemCount.toLocaleString()}
              </Badge>
            </div>
            {salesData.total > 0 && salesData.itemCount > 0 && (
              <div className="text-muted text-nowrap" style={{ fontSize: "0.7rem" }}>
                Avg. Value: {formatCurrency(salesData.total / salesData.itemCount)}
              </div>
            )}
          </div>
        </>
      )}
    </Container>
  );
};

export default MainTotalSalesPerYear;