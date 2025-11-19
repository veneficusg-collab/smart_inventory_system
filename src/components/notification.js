import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { ListGroup, Spinner, Nav, Badge } from "react-bootstrap";

const PAGE_SIZE = 20; // how many logs per page

// Notification sound - simple beep using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Notification manager for real-time alerts
class NotificationManager {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(notification) {
    this.listeners.forEach((listener) => listener(notification));
  }
}

export const notificationManager = new NotificationManager();

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const Notifications = ({ onClose, onMarkAsRead, readNotificationIds }) => {
  const [logs, setLogs] = useState([]);
  const [retrievals, setRetrievals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true); // first load
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0); // next offset to fetch
  const [retrievalOffset, setRetrievalOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true); // whether there is more to fetch
  const [hasMoreRetrievals, setHasMoreRetrievals] = useState(true);
  const [activeTab, setActiveTab] = useState("alerts"); // "alerts", "inventory" or "retrievals"
  const [alertsLoading, setAlertsLoading] = useState(true);
  const scrollRef = useRef(null);
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // ---- helpers ----
  const dedupeById = (items) => {
    const seen = new Set();
    return items.filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  };

  // Fetch product alerts
  const fetchProductAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true);

      // Check near expiration (3 months threshold)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      const { data: expirationData, error: expirationError } = await supabase
        .from("products")
        .select(
          "product_ID, product_name, product_quantity, product_expiry, product_img"
        )
        .lte("product_expiry", threeMonthsFromNow.toISOString())
        .not("product_expiry", "is", null)
        .gt("product_quantity", 0);

      if (expirationError) throw expirationError;

      // Check low stocks
      const { data: lowStockData, error: lowStockError } = await supabase
        .from("products")
        .select("product_ID, product_name, product_quantity, product_img")
        .lt("product_quantity", 20)
        .order("product_quantity", { ascending: true });

      if (lowStockError) throw lowStockError;

      // Format alerts for display
      const expirationAlerts = (expirationData || []).map((item) => {
        const daysLeft = Math.ceil(
          (new Date(item.product_expiry) - new Date()) / (1000 * 60 * 60 * 24)
        );
        const severity = getExpirationSeverity(item.product_expiry);

        return {
          id: `exp_${item.product_ID}`,
          type: "near_expiration",
          title: "Expiring Soon",
          product_name: item.product_name,
          product_quantity: item.product_quantity,
          message: `Expires in ${daysLeft} days`,
          severity: severity,
          timestamp: item.product_expiry,
          productId: item.product_ID,
          product_img: item.product_img,
        };
      });

      const stockAlerts = (lowStockData || []).map((item) => {
        const severity =
          item.product_quantity === 0
            ? "critical"
            : item.product_quantity < 5
            ? "high"
            : "medium";

        return {
          id: `stock_${item.product_ID}`,
          type: "low_stock",
          title: "Low Stock",
          product_name: item.product_name,
          product_quantity: item.product_quantity,
          message: `${item.product_quantity} units left`,
          severity: severity,
          timestamp: new Date().toISOString(),
          productId: item.product_ID,
          product_img: item.product_img,
        };
      });

      const allAlerts = [...expirationAlerts, ...stockAlerts].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      setAlerts(allAlerts);

      // Notify parent of new unread alerts and play sound
      if (!isInitialMount.current && allAlerts.length > 0) {
        const newAlertIds = allAlerts
          .filter(alert => !readNotificationIds.has(alert.id))
          .map(alert => alert.id);
        
        if (newAlertIds.length > 0 && onMarkAsRead) {
          onMarkAsRead(newAlertIds);
          playNotificationSound();
        }
      }
    } catch (error) {
      console.error("Error fetching product alerts:", error);
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [readNotificationIds, onMarkAsRead]);

  const fetchInventoryPage = useCallback(async (startOffset) => {
    const { data, error } = await supabase
      .from("logs")
      .select("id, product_name, product_action, staff, created_at")
      .order("created_at", { ascending: false })
      .range(startOffset, startOffset + PAGE_SIZE - 1);

    if (error) throw error;

    // update list
    if (startOffset === 0) {
      setLogs(data);
    } else {
      setLogs((prev) => dedupeById([...prev, ...(data || [])]));
    }

    // set next offset + hasMore
    const got = data?.length ?? 0;
    setOffset(startOffset + got);
    setHasMore(got === PAGE_SIZE);
  }, []);

  const fetchRetrievalsPage = useCallback(async (startOffset) => {
    const { data, error } = await supabase
      .from("main_retrievals")
      .select("id, staff_name, items, retrieved_at, status")
      .order("retrieved_at", { ascending: false })
      .range(startOffset, startOffset + PAGE_SIZE - 1);

    if (error) throw error;

    // update list
    if (startOffset === 0) {
      setRetrievals(data);
    } else {
      setRetrievals((prev) => dedupeById([...prev, ...(data || [])]));
    }

    // set next offset + hasMore
    const got = data?.length ?? 0;
    setRetrievalOffset(startOffset + got);
    setHasMoreRetrievals(got === PAGE_SIZE);
  }, []);

  // Mark notification as read
  const markAsRead = (id) => {
    if (onMarkAsRead) {
      onMarkAsRead([id]);
    }
  };

  // Mark all as read in current tab
  const markAllAsRead = () => {
    let currentIds = [];

    if (activeTab === "inventory") {
      currentIds = logs.map((item) => item.id);
    } else if (activeTab === "retrievals") {
      currentIds = retrievals.map((item) => item.id);
    } else if (activeTab === "alerts") {
      currentIds = alerts.map((item) => item.id);
    }

    if (onMarkAsRead && currentIds.length > 0) {
      onMarkAsRead(currentIds);
    }
  };

  // initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchInventoryPage(0),
          fetchRetrievalsPage(0),
          fetchProductAlerts(),
        ]);
      } finally {
        setLoading(false);
        isInitialMount.current = false;
      }
    })();
  }, [fetchInventoryPage, fetchRetrievalsPage, fetchProductAlerts]);

  // realtime inserts for inventory logs
  useEffect(() => {
    const channel = supabase
      .channel("logs-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        (payload) => {
          setLogs((prev) => {
            const newLogs = dedupeById([payload.new, ...prev]);
            return newLogs;
          });
          setOffset((prev) => prev + 1);
          
          // Play sound and notify parent for new notification
          if (!isInitialMount.current && !readNotificationIds.has(payload.new.id)) {
            playNotificationSound();
            if (onMarkAsRead) {
              onMarkAsRead([payload.new.id]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [readNotificationIds, onMarkAsRead]);

  // realtime inserts for retrievals
  useEffect(() => {
    const channel = supabase
      .channel("retrievals-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "main_retrievals" },
        (payload) => {
          setRetrievals((prev) => {
            const newRetrievals = dedupeById([payload.new, ...prev]);
            return newRetrievals;
          });
          setRetrievalOffset((prev) => prev + 1);
          
          // Play sound and notify parent for new notification
          if (!isInitialMount.current && !readNotificationIds.has(payload.new.id)) {
            playNotificationSound();
            if (onMarkAsRead) {
              onMarkAsRead([payload.new.id]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [readNotificationIds, onMarkAsRead]);

  // realtime monitoring for product changes
  useEffect(() => {
    const channel = supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchProductAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProductAlerts]);

  // Listen for real-time alert notifications
  useEffect(() => {
    const unsubscribe = notificationManager.subscribe((notification) => {
      setAlerts((prev) => {
        const filtered = prev.filter((alert) => alert.id !== notification.id);
        return [notification, ...filtered];
      });

      // Play sound and notify parent
      if (!isInitialMount.current && !readNotificationIds.has(notification.id)) {
        playNotificationSound();
        if (onMarkAsRead) {
          onMarkAsRead([notification.id]);
        }
      }
    });

    return unsubscribe;
  }, [readNotificationIds, onMarkAsRead]);

  // load more when scrolling near bottom
  const onScroll = async (e) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;

    if (nearBottom && !loadingMore && !loading) {
      if (activeTab === "inventory" && hasMore) {
        setLoadingMore(true);
        try {
          await fetchInventoryPage(offset);
        } finally {
          setLoadingMore(false);
        }
      } else if (activeTab === "retrievals" && hasMoreRetrievals) {
        setLoadingMore(true);
        try {
          await fetchRetrievalsPage(retrievalOffset);
        } finally {
          setLoadingMore(false);
        }
      }
      // Alerts don't have pagination - they show all current alerts
    }
  };

  // Helper functions for alerts
  const getExpirationSeverity = (expiryDate) => {
    const daysLeft = Math.ceil(
      (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 0) return "critical";
    if (daysLeft <= 7) return "high";
    if (daysLeft <= 30) return "medium";
    return "low";
  };

  const getAlertBadgeVariant = (type, severity) => {
    if (type === "near_expiration") {
      return severity === "critical" ? "danger" : "warning";
    }
    return severity === "critical" ? "danger" : "warning";
  };

  const getSeverityBadgeVariant = (severity) => {
    switch (severity) {
      case "critical":
        return "danger";
      case "high":
        return "warning";
      case "medium":
        return "info";
      default:
        return "secondary";
    }
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case "critical":
        return "Critical";
      case "high":
        return "High";
      case "medium":
        return "Medium";
      default:
        return "Low";
    }
  };

  // Render inventory log item
  const renderInventoryLog = (log) => (
    <ListGroup.Item
      key={log.id}
      onClick={() => markAsRead(log.id)}
      style={{
        cursor: "pointer",
        borderLeft: !readNotificationIds.has(log.id)
          ? "4px solid #dc3545"
          : "4px solid transparent",
      }}
    >
      <div className="d-flex align-items-start">
        {!readNotificationIds.has(log.id) && (
          <span
            className="me-2 mt-1"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#dc3545",
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
        )}
        <div className="flex-grow-1">
          <div>
            <strong>{log.staff}</strong> {log.product_action}{" "}
            <strong>{log.product_name}</strong>
          </div>
          <small className="text-muted">
            {new Date(log.created_at).toLocaleString()}
          </small>
        </div>
      </div>
    </ListGroup.Item>
  );

  // Render retrieval log item
  const renderRetrievalLog = (retrieval) => (
    <ListGroup.Item
      key={retrieval.id}
      onClick={() => markAsRead(retrieval.id)}
      style={{
        cursor: "pointer",
        borderLeft: !readNotificationIds.has(retrieval.id)
          ? "4px solid #dc3545"
          : "4px solid transparent",
      }}
    >
      <div className="d-flex align-items-start">
        {!readNotificationIds.has(retrieval.id) && (
          <span
            className="me-2 mt-1"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#dc3545",
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
        )}
        <div className="flex-grow-1">
          <div>
            <strong>{retrieval.staff_name}</strong> retrieved{" "}
            <strong>
              {retrieval.items?.length || 0} item
              {retrieval.items?.length !== 1 ? "s" : ""}
            </strong>
          </div>
          <small className="text-muted">
            {new Date(retrieval.retrieved_at).toLocaleString()}
          </small>
          {retrieval.items && (
            <div style={{ fontSize: "0.8em", marginTop: "4px" }}>
              {retrieval.items.slice(0, 2).map((item, idx) => (
                <span key={idx} className="text-muted">
                  {item.product_name || item.product_id} x{item.qty}
                  {idx < Math.min(retrieval.items.length - 1, 1) ? ", " : ""}
                </span>
              ))}
              {retrieval.items.length > 2 && (
                <span className="text-muted">
                  {" "}
                  and {retrieval.items.length - 2} more...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </ListGroup.Item>
  );

  // Render alert item
  const renderAlert = (alert) => (
    <ListGroup.Item
      key={alert.id}
      onClick={() => markAsRead(alert.id)}
      style={{
        cursor: "pointer",
        borderLeft: !readNotificationIds.has(alert.id)
          ? "4px solid #dc3545"
          : "4px solid transparent",
      }}
    >
      <div className="d-flex align-items-start">
        {!readNotificationIds.has(alert.id) && (
          <span
            className="me-2 mt-1"
            style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#dc3545",
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
        )}
        <div className="flex-grow-1">
          <div className="d-flex justify-content-between align-items-start mb-1">
            <div className="d-flex align-items-center">
              <Badge
                bg={getAlertBadgeVariant(alert.type, alert.severity)}
                className="me-2"
                style={{ fontSize: "0.7em" }}
              >
                {alert.type === "near_expiration" ? "Expiry" : "Stock"}
              </Badge>
              <strong className="me-2">{alert.product_name}</strong>
            </div>
            <Badge
              bg={getSeverityBadgeVariant(alert.severity)}
              style={{ fontSize: "0.6em" }}
            >
              {getSeverityText(alert.severity)}
            </Badge>
          </div>
          <div className="mb-1" style={{ fontSize: "0.9em" }}>
            {alert.message}
            {alert.type === "low_stock" && (
              <span className="text-muted ms-1">(Threshold: 20)</span>
            )}
          </div>
          <small className="text-muted">
            {alert.type === "near_expiration"
              ? `Expires: ${new Date(alert.timestamp).toLocaleDateString()}`
              : `Alerted: ${new Date(alert.timestamp).toLocaleString()}`}
          </small>
        </div>
      </div>
    </ListGroup.Item>
  );

  // Count unread notifications per tab
  const unreadInventoryCount = logs.filter((log) =>
    !readNotificationIds.has(log.id)
  ).length;
  const unreadRetrievalsCount = retrievals.filter((retrieval) =>
    !readNotificationIds.has(retrieval.id)
  ).length;
  const unreadAlertsCount = alerts.filter((alert) =>
    !readNotificationIds.has(alert.id)
  ).length;

  if (loading) {
    return (
      <div className="p-3">
        <Spinner animation="border" size="sm" />
      </div>
    );
  }

  return (
    <div
      className="position-absolute bg-white shadow rounded d-flex flex-column"
      style={{
        top: "60px",
        right: "20px",
        width: "450px",
        zIndex: 999,
        maxHeight: "500px",
      }}
    >
      <div className="p-2 border-bottom fw-bold d-flex justify-content-between align-items-center">
        <span>Notifications</span>
        <div>
          <span
            className="text-primary me-2"
            style={{ cursor: "pointer", fontWeight: 500, fontSize: "0.9em" }}
            onClick={markAllAsRead}
          >
            Mark this tab as read
          </span>
          <span
            className="text-primary"
            style={{ cursor: "pointer", fontWeight: 500, fontSize: "0.9em" }}
            onClick={onClose}
          >
            Close
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <Nav variant="tabs" className="px-2">
        <Nav.Item style={{ flex: 1 }}>
          <Nav.Link
            active={activeTab === "alerts"}
            onClick={() => setActiveTab("alerts")}
            className="text-center position-relative"
            style={{ fontSize: "0.8rem", padding: "8px 4px" }}
          >
            Alerts
            {unreadAlertsCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: "0.6rem" }}
              >
                {unreadAlertsCount}
              </span>
            )}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item style={{ flex: 1 }}>
          <Nav.Link
            active={activeTab === "inventory"}
            onClick={() => setActiveTab("inventory")}
            className="text-center position-relative"
            style={{ fontSize: "0.8rem", padding: "8px 4px" }}
          >
            Inventory
            {unreadInventoryCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: "0.6rem" }}
              >
                {unreadInventoryCount}
              </span>
            )}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item style={{ flex: 1 }}>
          <Nav.Link
            active={activeTab === "retrievals"}
            onClick={() => setActiveTab("retrievals")}
            className="text-center position-relative"
            style={{ fontSize: "0.8rem", padding: "8px 4px" }}
          >
            Retrievals
            {unreadRetrievalsCount > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: "0.6rem" }}
              >
                {unreadRetrievalsCount}
              </span>
            )}
          </Nav.Link>
        </Nav.Item>
      </Nav>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ overflowY: "auto", maxHeight: "400px" }}
        key={activeTab}
      >
        <ListGroup variant="flush">
          {activeTab === "alerts" ? (
            alertsLoading ? (
              <ListGroup.Item className="text-center">
                <Spinner animation="border" size="sm" />
                <div className="mt-1">Loading alerts...</div>
              </ListGroup.Item>
            ) : alerts.length === 0 ? (
              <ListGroup.Item className="text-center text-muted">
                No product alerts
                <div style={{ fontSize: "0.8em" }}>
                  You'll see low stock and expiration alerts here
                </div>
              </ListGroup.Item>
            ) : (
              alerts.map(renderAlert)
            )
          ) : activeTab === "inventory" ? (
            logs.length === 0 ? (
              <ListGroup.Item className="text-center text-muted">
                No inventory notifications yet
              </ListGroup.Item>
            ) : (
              logs.map(renderInventoryLog)
            )
          ) : retrievals.length === 0 ? (
            <ListGroup.Item className="text-center text-muted">
              No retrieval notifications yet
            </ListGroup.Item>
          ) : (
            retrievals.map(renderRetrievalLog)
          )}
        </ListGroup>

        {/* loader at bottom when fetching next page */}
        {loadingMore && (
          <div className="d-flex justify-content-center py-2">
            <Spinner animation="border" size="sm" />
          </div>
        )}
        {activeTab === "inventory" && !hasMore && logs.length > 0 && (
          <div className="text-center text-muted py-2" style={{ fontSize: 12 }}>
            End of inventory notifications
          </div>
        )}
        {activeTab === "retrievals" &&
          !hasMoreRetrievals &&
          retrievals.length > 0 && (
            <div
              className="text-center text-muted py-2"
              style={{ fontSize: 12 }}
            >
              End of retrieval notifications
            </div>
          )}
        {activeTab === "alerts" && alerts.length > 0 && (
          <div className="text-center text-muted py-2" style={{ fontSize: 12 }}>
            Showing all current alerts
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;