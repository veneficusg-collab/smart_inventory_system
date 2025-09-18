import { useEffect, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { FaBox } from "react-icons/fa";
import { CiLocationOn } from "react-icons/ci";
import { supabase } from "../supabaseClient"; // adjust if needed

const InventorySummary = () => {
  const [quantityInHand, setQuantityInHand] = useState(0);
  const [toBeReceived, setToBeReceived] = useState(0);

  useEffect(() => {
    const fetchQuantities = async () => {
      // 📌 Get all quantities from products
      const { data, error } = await supabase
        .from("products")
        .select("product_quantity"); // adjust column names if different

      if (!error && data) {
        // Sum of quantity
        const totalQty = data.reduce((sum, item) => sum + (item.product_quantity || 0), 0);
        setQuantityInHand(totalQty);
      }
    };

    fetchQuantities();
  }, []);

  return (
    <Container className="bg-white m-4 rounded text-center" style={{ width: "360px" }}>
      <span className="mx-0 mt-3 mb-2 d-inline-block" style={{ fontWeight: "10px" }}>
        Inventory Summary
      </span>
      <Row>
        <Col md={12} className="border-end">
          <div className="d-flex flex-column align-items-center my-4">
            <FaBox />
            <span className="mx-0 m-1 d-inline-block">{quantityInHand}</span>
            <span className="mx-0 mt-0 d-inline-block">Quantity in Hand</span>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default InventorySummary;
