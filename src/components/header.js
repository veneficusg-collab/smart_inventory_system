import { useState, useEffect } from "react";
import { Container, Image, Modal, Button } from "react-bootstrap";
import { IoMdNotificationsOutline } from "react-icons/io";
import Notifications from "./notification";
import { supabase } from "../supabaseClient";
import { User } from "lucide-react";
import StaffInfo from "./staff-info"; // ✅ reuse your existing component

const Header = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [staffName, setStaffName] = useState("");
  const [staffImg, setStaffImg] = useState(null);
  const [staffId, setStaffId] = useState(null);

  // Modal state
  const [showStaffModal, setShowStaffModal] = useState(false);

  useEffect(() => {
    // ✅ Listen to new logs in realtime
    const channel = supabase
      .channel("logs-notif")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ Also listen to retrieval notifications
  useEffect(() => {
    const channel = supabase
      .channel("retrievals-notif")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "main_retrievals" },
        () => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ Fetch staff_name + staff_img
  useEffect(() => {
    const fetchStaff = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setStaffId(user.id);
        const { data: staff, error } = await supabase
          .from("staff")
          .select("staff_name, staff_img")
          .eq("id", user.id)
          .single();

        if (!error && staff) {
          setStaffName(staff.staff_name);

          if (staff.staff_img) {
            const { data: publicUrlData } = supabase.storage
              .from("Smart-Inventory-System-(Pet Matters)")
              .getPublicUrl(staff.staff_img);

            setStaffImg(publicUrlData.publicUrl);
          }
        }
      } else {
        // fallback: QR login stored in localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setStaffId(parsed.id);
          setStaffName(parsed.staff_name || "User");
        }
      }
    };

    fetchStaff();
  }, []);

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  // Function to mark all notifications as read
  const handleMarkAllAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <>
      <Container
        fluid
        className="bg-white d-flex align-items-center justify-content-between w-100 position-relative"
        style={{ height: "70px" }}
      >
        {/* Left: Clinic Name */}
        <h5 className="m-0 ms-3 fw-bold" style={{ color: "#000000" }}>
          Pet Matters Animal Clinic
        </h5>

        {/* Right: Notifications + Staff */}
        <div className="d-flex align-items-center gap-2">
          {/* Notifications */}
          <div
            className="position-relative me-3"
            style={{ cursor: "pointer" }}
            onClick={toggleNotifications}
          >
            <IoMdNotificationsOutline size={28} />
            
            {/* Red dot for unread notifications - always show when there are unread notifications */}
            {unreadCount > 0 && (
              <>
                {/* Small red dot */}
                <span
                  className="position-absolute top-0 start-100 translate-middle bg-danger rounded-circle"
                  style={{ 
                    width: "12px", 
                    height: "12px", 
                    border: "2px solid white",
                    transform: "translate(-30%, -30%)" // Position it slightly inside
                  }}
                />
                
                {/* Number badge */}
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ 
                    fontSize: "10px", 
                    padding: "3px 6px",
                    transform: "translate(-30%, -30%)"
                  }}
                >
                  {unreadCount}
                </span>
              </>
            )}
          </div>

          {showNotifications && (
            <Notifications 
              onClose={handleCloseNotifications}
              onMarkAllAsRead={handleMarkAllAsRead} // Pass callback to clear unread count
            />
          )}

          {/* Staff Avatar + Name */}
          <div
            className="d-flex align-items-center gap-2 me-3"
            style={{ cursor: "pointer" }}
            onClick={() => setShowStaffModal(true)} // 👈 open modal on click
          >
            {staffImg ? (
              <Image
                src={staffImg}
                style={{
                  width: "45px",
                  height: "45px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                className="d-flex align-items-center justify-content-center bg-secondary text-white"
                style={{
                  width: "45px",
                  height: "45px",
                  borderRadius: "50%",
                }}
              >
                <User size={24} />
              </div>
            )}
            <span className="fw-bold" style={{ fontSize: "0.9rem", color: "#333" }}>
              {staffName || "Loading..."}
            </span>
          </div>
        </div>
      </Container>

      {/* Staff Info Modal */}
      <Modal
        show={showStaffModal}
        onHide={() => setShowStaffModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Staff Info</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {staffId ? (
            <StaffInfo staffId={staffId} embedded />
          ) : (
            <p>Loading staff info...</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStaffModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Header;