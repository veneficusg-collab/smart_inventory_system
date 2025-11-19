import { useState, useEffect } from "react";
import { Container, Image, Modal, Button } from "react-bootstrap";
import { IoMdNotificationsOutline } from "react-icons/io";
import Notifications from "./notification";
import { supabase } from "../supabaseClient";
import { User } from "lucide-react";
import StaffInfo from "./staff-info";
import ErrorBoundary from "./ErrorBoundary";

const Header = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [staffName, setStaffName] = useState("");
  const [staffImg, setStaffImg] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [error, setError] = useState(null);

  // Load read notifications from localStorage on component mount
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const saved = localStorage.getItem('readNotifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (err) {
      console.error('Error loading read notifications:', err);
      return new Set();
    }
  });

  // Track all notification IDs to prevent duplicates
  const [allNotificationIds, setAllNotificationIds] = useState(new Set());

  // Save to localStorage whenever readNotificationIds changes
  useEffect(() => {
    try {
      localStorage.setItem('readNotifications', JSON.stringify([...readNotificationIds]));
    } catch (err) {
      console.error('Error saving read notifications:', err);
    }
  }, [readNotificationIds]);

  // Calculate unread count based on all IDs minus read IDs
  useEffect(() => {
    try {
      const unreadIds = new Set([...allNotificationIds].filter(id => !readNotificationIds.has(id)));
      setUnreadCount(unreadIds.size);
    } catch (err) {
      console.error('Error calculating unread count:', err);
      setUnreadCount(0);
    }
  }, [allNotificationIds, readNotificationIds]);

  // Fetch initial notifications and set up real-time listeners
  useEffect(() => {
    let isMounted = true;
    let logsChannel = null;
    let retrievalsChannel = null;
    let productsChannel = null;

    const initializeNotifications = async () => {
      try {
        // Get recent notifications (last 100 of each type)
        const [logsResponse, retrievalsResponse, productsResponse] = await Promise.all([
          supabase
            .from("logs")
            .select("id, created_at")
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("main_retrievals")
            .select("id, retrieved_at")
            .order("retrieved_at", { ascending: false })
            .limit(100),
          supabase
            .from("products")
            .select("product_ID, product_quantity, product_expiry")
        ]);

        if (!isMounted) return;

        if (logsResponse.error) throw logsResponse.error;
        if (retrievalsResponse.error) throw retrievalsResponse.error;
        if (productsResponse.error) throw productsResponse.error;

        // Calculate alert IDs
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

        const alertIds = new Set();
        (productsResponse.data || []).forEach(product => {
          // Low stock alerts
          if (product.product_quantity < 20) {
            alertIds.add(`stock_${product.product_ID}`);
          }
          // Expiration alerts
          if (product.product_expiry && 
              new Date(product.product_expiry) <= threeMonthsFromNow &&
              product.product_quantity > 0) {
            alertIds.add(`exp_${product.product_ID}`);
          }
        });

        const allIds = new Set([
          ...(logsResponse.data || []).map(item => item.id),
          ...(retrievalsResponse.data || []).map(item => item.id),
          ...alertIds
        ]);

        setAllNotificationIds(allIds);

        // Set up real-time listeners after initial load
        setupRealtimeListeners();
        
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setError(error.message);
      }
    };

    const setupRealtimeListeners = () => {
      try {
        // Clean up existing channels first
        if (logsChannel) {
          supabase.removeChannel(logsChannel);
        }
        if (retrievalsChannel) {
          supabase.removeChannel(retrievalsChannel);
        }
        if (productsChannel) {
          supabase.removeChannel(productsChannel);
        }

        logsChannel = supabase
          .channel("logs-realtime-header")
          .on(
            "postgres_changes",
            { 
              event: "INSERT", 
              schema: "public", 
              table: "logs" 
            },
            (payload) => {
              if (!isMounted) return;
              console.log("New log notification:", payload.new);
              const newId = payload.new.id;
              setAllNotificationIds(prev => {
                // Prevent duplicates
                if (prev.has(newId)) return prev;
                return new Set([...prev, newId]);
              });
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Listening for log changes in header');
            }
          });

        retrievalsChannel = supabase
          .channel("retrievals-realtime-header")
          .on(
            "postgres_changes",
            { 
              event: "INSERT", 
              schema: "public", 
              table: "main_retrievals" 
            },
            (payload) => {
              if (!isMounted) return;
              console.log("New retrieval notification:", payload.new);
              const newId = payload.new.id;
              setAllNotificationIds(prev => {
                // Prevent duplicates
                if (prev.has(newId)) return prev;
                return new Set([...prev, newId]);
              });
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Listening for retrieval changes in header');
            }
          });

        productsChannel = supabase
          .channel("products-realtime-header")
          .on(
            "postgres_changes",
            { 
              event: "*", 
              schema: "public", 
              table: "products" 
            },
            async (payload) => {
              if (!isMounted) return;
              console.log("Product change detected:", payload);
              
              // Recalculate alert IDs when products change
              try {
                const { data: products, error } = await supabase
                  .from("products")
                  .select("product_ID, product_quantity, product_expiry");

                if (error) throw error;

                const threeMonthsFromNow = new Date();
                threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

                const newAlertIds = new Set();
                (products || []).forEach(product => {
                  if (product.product_quantity < 20) {
                    newAlertIds.add(`stock_${product.product_ID}`);
                  }
                  if (product.product_expiry && 
                      new Date(product.product_expiry) <= threeMonthsFromNow &&
                      product.product_quantity > 0) {
                    newAlertIds.add(`exp_${product.product_ID}`);
                  }
                });

                setAllNotificationIds(prev => {
                  const updatedIds = new Set(prev);
                  // Remove old alert IDs and add new ones
                  [...prev].forEach(id => {
                    if (id.startsWith('stock_') || id.startsWith('exp_')) {
                      updatedIds.delete(id);
                    }
                  });
                  newAlertIds.forEach(id => updatedIds.add(id));
                  return updatedIds;
                });
              } catch (error) {
                console.error("Error recalculating alerts:", error);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Listening for product changes in header');
            }
          });

      } catch (error) {
        console.error('Error setting up real-time listeners:', error);
        setError(error.message);
      }
    };

    initializeNotifications();

    return () => {
      isMounted = false;
      if (logsChannel) {
        supabase.removeChannel(logsChannel);
      }
      if (retrievalsChannel) {
        supabase.removeChannel(retrievalsChannel);
      }
      if (productsChannel) {
        supabase.removeChannel(productsChannel);
      }
    };
  }, []);

  // ✅ Fetch staff_name + staff_img
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
          // fallback: QR login stored in localStorage
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
    setShowNotifications((prev) => !prev);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  // Function to mark notifications as read
  const handleMarkAsRead = (readIds = []) => {
    try {
      console.log("Marking as read:", readIds);
      
      setReadNotificationIds(prev => {
        if (readIds.length === 0) {
          // Mark all as read - add all current notification IDs to read set
          return new Set([...prev, ...allNotificationIds]);
        } else {
          // Mark specific IDs as read - ensure we're only adding valid IDs
          const validIds = readIds.filter(id => id && !prev.has(id));
          if (validIds.length === 0) return prev;
          return new Set([...prev, ...validIds]);
        }
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      setError(error.message);
    }
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

  return (
    <ErrorBoundary>
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
            
            {/* Red dot for unread notifications */}
            {unreadCount > 0 && (
              <>
                <span
                  className="position-absolute top-0 start-100 translate-middle bg-danger rounded-circle"
                  style={{ 
                    width: "12px", 
                    height: "12px", 
                    border: "2px solid white",
                    transform: "translate(-30%, -30%)"
                  }}
                />
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ 
                    fontSize: "10px", 
                    padding: "3px 6px",
                    transform: "translate(-30%, -30%)"
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </>
            )}
          </div>

          {showNotifications && (
            <Notifications 
              onClose={handleCloseNotifications}
              onMarkAsRead={handleMarkAsRead}
              readNotificationIds={readNotificationIds}
            />
          )}

          {/* Staff Avatar + Name */}
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
    </ErrorBoundary>
  );
};

export default Header;