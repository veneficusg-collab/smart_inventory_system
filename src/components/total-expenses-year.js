import { useEffect, useState, useMemo } from "react";
import { Container, Spinner, Row, Col, Badge } from "react-bootstrap";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CiCalendar } from "react-icons/ci";
import { FaFileInvoiceDollar, FaWarehouse, FaClinicMedical } from "react-icons/fa";
import { supabase } from "../supabaseClient";

const TotalExpensesPerYear = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [expensesData, setExpensesData] = useState({
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
    fetchTotalExpenses(year);
    
    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => fetchTotalExpenses(year)
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'main_stock_room_products' },
        () => fetchTotalExpenses(year)
      )
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }, [year]);

  const fetchTotalExpenses = async (selectedYear) => {
    setLoading(true);
    try {
      const { data: supplierPrices, error: priceError } = await supabase
        .from("products")
        .select("product_ID, supplier_price");
      
      if (priceError) throw priceError;

      const priceMap = {};
      supplierPrices.forEach((p) => {
        priceMap[p.product_ID] = Number(p.supplier_price ?? 0);
      });

      const { data: pharmacyItems, error: pharmacyError } = await supabase
        .from("products")
        .select("product_ID, product_quantity");
      
      if (pharmacyError) throw pharmacyError;

      const { data: stockRoomItems, error: stockRoomError } = await supabase
        .from("main_stock_room_products")
        .select("product_ID, product_quantity");
      
      if (stockRoomError) throw stockRoomError;

      let pharmacyExpenses = 0;
      let mainStockRoomExpenses = 0;
      let totalItems = 0;

      pharmacyItems.forEach((item) => {
        const supplierPrice = priceMap[item.product_ID] ?? 0;
        const qty = Number(item.product_quantity ?? 0);
        pharmacyExpenses += supplierPrice * qty;
        totalItems += qty;
      });

      stockRoomItems.forEach((item) => {
        const supplierPrice = priceMap[item.product_ID] ?? 0;
        const qty = Number(item.product_quantity ?? 0);
        mainStockRoomExpenses += supplierPrice * qty;
        totalItems += qty;
      });

      const totalExpenses = pharmacyExpenses + mainStockRoomExpenses;

      setExpensesData({
        pharmacy: pharmacyExpenses,
        mainStockRoom: mainStockRoomExpenses,
        total: totalExpenses,
        itemCount: totalItems
      });

    } catch (err) {
      console.error("Error fetching total expenses:", err);
      setExpensesData({
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
          <FaFileInvoiceDollar size={20} className="text-danger me-2 flex-shrink-0" />
          <h6 className="mb-0 fw-bold text-nowrap">
            Total Expenses
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
            <h4 className="fw-bold text-danger mb-0" style={{ 
              fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
              lineHeight: 1.2 
            }}>
              <span className="d-none d-md-inline">
                {formatCurrency(expensesData.total)}
              </span>
              <span className="d-inline d-md-none">
                {formatCompactCurrency(expensesData.total)}
              </span>
            </h4>
          </div>
          
          <Row className="g-2 mb-2">
            <Col xs={6}>
              <div className="d-flex align-items-center mb-1">
                <FaClinicMedical size={14} className="text-primary me-1 flex-shrink-0" />
                <small className="text-muted text-nowrap">Pharmacy:</small>
              </div>
              <div className="fw-bold text-nowrap" style={{ 
                fontSize: "clamp(0.75rem, 2vw, 0.9rem)" 
              }}>
                <span className="d-none d-sm-inline">
                  {formatCurrency(expensesData.pharmacy)}
                </span>
                <span className="d-inline d-sm-none">
                  {formatCompactCurrency(expensesData.pharmacy)}
                </span>
              </div>
            </Col>
            <Col xs={6}>
              <div className="d-flex align-items-center mb-1">
                <FaWarehouse size={14} className="text-dark me-1 flex-shrink-0" />
                <small className="text-muted text-nowrap">Main Stock:</small>
              </div>
              <div className="fw-bold text-nowrap" style={{ 
                fontSize: "clamp(0.75rem, 2vw, 0.9rem)" 
              }}>
                <span className="d-none d-sm-inline">
                  {formatCurrency(expensesData.mainStockRoom)}
                </span>
                <span className="d-inline d-sm-none">
                  {formatCompactCurrency(expensesData.mainStockRoom)}
                </span>
              </div>
            </Col>
          </Row>
          
          <div className="pt-2 border-top">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted text-nowrap">
                Total Items: 
              </small>
              <Badge bg="secondary" pill>
                {expensesData.itemCount.toLocaleString()}
              </Badge>
            </div>
            {expensesData.total > 0 && expensesData.itemCount > 0 && (
              <div className="text-muted text-nowrap" style={{ fontSize: "0.7rem" }}>
                Avg. Cost: {formatCurrency(expensesData.total / expensesData.itemCount)}
              </div>
            )}
          </div>
        </>
      )}
    </Container>
  );
};

export default TotalExpensesPerYear;