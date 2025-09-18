import { useState, useEffect } from "react";
import { Container, Image } from "react-bootstrap";
import { IoMdNotificationsOutline } from "react-icons/io";
import logo from "../logo.png";
import Notifications from "./notification";
import { supabase } from "../supabaseClient";

const Header = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const toggleNotifications = () => {
    setShowNotifications((prev) => !prev);
    if (!showNotifications) {
      setUnreadCount(0);
    }
  };

  return (
    <Container
      fluid
      className="bg-white d-flex align-items-center justify-content-between w-100 position-relative"
      style={{ height: "70px" }}
    >
      {/* Left: Clinic Name */}
      <h5
        className="m-0 ms-3 fw-bold"
        style={{ color: "#000000" }} // matched yellow from logo
      >
        Pet Matters Animal Clinic
      </h5>

      {/* Right: Notification + Avatar */}
      <div className="d-flex align-items-center">
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
              style={{ fontSize: "12px", padding: "3px 6px" }}
            >
              {unreadCount}
            </span>
          )}
        </div>

        {showNotifications && (
          <Notifications onClose={() => setShowNotifications(false)} />
        )}

        {/* Logo */}
        <Image
          src={logo}
          style={{
            width: "45px",
            height: "45px",
            borderRadius: "50%",
            objectFit: "cover",
            cursor: "pointer",
          }}
        />
      </div>
    </Container>
  );
};

export default Header;
