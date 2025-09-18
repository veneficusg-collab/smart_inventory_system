import { useEffect, useState } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { FaRegCircleUser } from "react-icons/fa6";
import { FaClipboardList } from "react-icons/fa6";
import { supabase } from "../supabaseClient"; // adjust path if needed

const StaffSummary = () => {
  const [staffCount, setStaffCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch number of staff
      const { count: staffCount, error: staffError } = await supabase
        .from("staff") // replace with your staff table name
        .select("*", { count: "exact", head: true })
        .eq('staff_position', 'staff');
        

      if (staffError) {
        console.error("Error fetching staff count:", staffError);
      } else {
        setStaffCount(staffCount);
      }
    };

    fetchData();
  }, []);

  return (
    <Container
      className="bg-white mx-4 rounded text-center"
      style={{ width: "360px", marginTop: "31px" }}
    >
      <span
        className="mx-0 mt-3 mb-2 d-inline-block "
        style={{ fontWeight: "10px" }}
      >
        Staff Summary
      </span>
      <Row>
        <Col md={12} className="border-end">
          <div className="d-flex flex-column align-items-center my-4">
            <FaRegCircleUser />
            <span className="mx-0 m-1 d-inline-block">{staffCount}</span>
            <span className="mx-0 mt-0 d-inline-block">Number of Staff</span>
          </div>
        </Col>
        
      </Row>
    </Container>
  );
};

export default StaffSummary;
