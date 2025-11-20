import { useState, useEffect } from "react";
import { Container, Image, Modal, Button } from "react-bootstrap";
import { IoMdNotificationsOutline } from "react-icons/io";
import Notifications from "./notification";
import { supabase } from "../supabaseClient";
import { User } from "lucide-react";
import StaffInfo from "./staff-info";
import ErrorBoundary from "./ErrorBoundary";
import { useNotifications } from "./NotificationContext";

const Header = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffImg, setStaffImg] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [error, setError] = useState(null);

  // Use notification context - it already handles real-time updates!
  const { readNotificationIds, markAsRead, unreadCount } = useNotifications();

  // Fetch staff info
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;

        if (user) {
          setStaffId(user.id);
          const { data: staff, error: staffError } = await supabase
            .from("staff")
            .select("staff_name, staff_img")
            .eq("id", user.id)
            .single();

          if (staffError) throw staffError;

          if (staff) {
            setStaffName(staff.staff_name);

            if (staff.staff_img) {
              const { data: publicUrlData } = supabase.storage
                .from("Smart-Inventory-System-(Pet Matters)")
                .getPublicUrl(staff.staff_img);

              setStaffImg(publicUrlData.publicUrl);
            }
          }
        } else {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              setStaffId(parsed.id);
              setStaffName(parsed.staff_name || "User");
            } catch (parseError) {
              console.error('Error parsing stored user:', parseError);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching staff:", error);
        setError(error.message);
      }
    };

    fetchStaff();
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  if (error) {
    return (
      <Container fluid className="bg-white d-flex align-items-center justify-content-between w-100" style={{ height: "70px" }}>
        <div className="alert alert-warning m-0 w-100">
          <strong>Warning:</strong> There was an error loading notifications. 
          <button 
            className="btn btn-sm btn-outline-secondary ms-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      </Container>
    );
  }

  // Calculate display count
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  console.log('🎨 Header rendering with unread count from context:', unreadCount);

  return (
    <ErrorBoundary>
      <Container
        fluid
        className="bg-white d-flex align-items-center justify-content-between w-100 position-relative"
        style={{ height: "70px" }}
      >
        <h5 className="m-0 ms-3 fw-bold" style={{ color: "#000000" }}>
          Pet Matters Animal Clinic
        </h5>

        <div className="d-flex align-items-center gap-2">
          {/* Notifications */}
          <div
            className="position-relative me-3"
            style={{ cursor: "pointer" }}
            onClick={toggleNotifications}
          >
            <IoMdNotificationsOutline size={28} />
            
            {unreadCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ 
                  fontSize: "10px", 
                  padding: "3px 6px",
                  transform: "translate(-30%, -30%)",
                  minWidth: "20px"
                }}
              >
                {displayCount}
              </span>
            )}
          </div>

          {showNotifications && (
            <Notifications 
              onClose={handleCloseNotifications}
              onMarkAsRead={markAsRead}
              readNotificationIds={readNotificationIds}
            />
          )}

          {/* Staff Avatar */}
          <div
            className="d-flex align-items-center gap-2 me-3"
            style={{ cursor: "pointer" }}
            onClick={() => setShowStaffModal(true)}
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
                onError={(e) => {
                  e.target.style.display = 'none';
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
    </ErrorBoundary>
  );
};

export default Header;