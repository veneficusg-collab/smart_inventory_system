import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { ListGroup, Spinner, Nav } from "react-bootstrap";

const PAGE_SIZE = 20;

const Notifications = ({ onClose, onMarkAsRead, readNotificationIds }) => {
  const [logs, setLogs] = useState([]);
  const [retrievals, setRetrievals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [retrievalOffset, setRetrievalOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [hasMoreRetrievals, setHasMoreRetrievals] = useState(true);
  const [activeTab, setActiveTab] = useState("inventory");
  const scrollRef = useRef(null);

  const dedupeById = (items) => {
    const seen = new Set();
    return items.filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  };

  const fetchInventoryPage = useCallback(async (startOffset) => {
    const { data, error } = await supabase
      .from("logs")
      .select("id, product_name, product_action, staff, created_at")
      .order("created_at", { ascending: false })
      .range(startOffset, startOffset + PAGE_SIZE - 1);

    if (error) throw error;

    if (startOffset === 0) {
      setLogs(data || []);
    } else {
      setLogs((prev) => dedupeById([...prev, ...(data || [])]));
    }

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

    if (startOffset === 0) {
      setRetrievals(data || []);
    } else {
      setRetrievals((prev) => dedupeById([...prev, ...(data || [])]));
    }

    const got = data?.length ?? 0;
    setRetrievalOffset(startOffset + got);
    setHasMoreRetrievals(got === PAGE_SIZE);
  }, []);

  // Mark notification as read
  const markAsRead = (id) => {
    if (onMarkAsRead && !readNotificationIds.has(id)) {
      onMarkAsRead([id]);
    }
  };

  // Mark all as read in current tab
  const markAllAsRead = () => {
    const currentItems = activeTab === "inventory" ? logs : retrievals;
    const unreadIds = currentItems
      .filter(item => !readNotificationIds.has(item.id))
      .map(item => item.id);
    
    if (onMarkAsRead && unreadIds.length > 0) {
      onMarkAsRead(unreadIds);
    }
  };

  // initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchInventoryPage(0),
          fetchRetrievalsPage(0)
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchInventoryPage, fetchRetrievalsPage]);

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
    }
  };

  // Count unread notifications per tab
  const unreadInventoryCount = logs.filter(log => !readNotificationIds.has(log.id)).length;
  const unreadRetrievalsCount = retrievals.filter(retrieval => !readNotificationIds.has(retrieval.id)).length;

  // Render inventory log item
  const renderInventoryLog = (log) => {
    const isUnread = !readNotificationIds.has(log.id);
    return (
      <ListGroup.Item 
        key={log.id} 
        onClick={() => markAsRead(log.id)}
        style={{ 
          cursor: 'pointer',
          borderLeft: isUnread ? '4px solid #dc3545' : '4px solid transparent',
          backgroundColor: isUnread ? '#f8f9fa' : 'transparent'
        }}
      >
        <div className="d-flex align-items-start">
          {isUnread && (
            <span 
              className="me-2 mt-1"
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#dc3545',
                borderRadius: '50%',
                flexShrink: 0
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
  };

  // Render retrieval log item
  const renderRetrievalLog = (retrieval) => {
    const isUnread = !readNotificationIds.has(retrieval.id);
    return (
      <ListGroup.Item 
        key={retrieval.id} 
        onClick={() => markAsRead(retrieval.id)}
        style={{ 
          cursor: 'pointer',
          borderLeft: isUnread ? '4px solid #dc3545' : '4px solid transparent',
          backgroundColor: isUnread ? '#f8f9fa' : 'transparent'
        }}
      >
        <div className="d-flex align-items-start">
          {isUnread && (
            <span 
              className="me-2 mt-1"
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#dc3545',
                borderRadius: '50%',
                flexShrink: 0
              }}
            />
          )}
          <div className="flex-grow-1">
            <div>
              <strong>{retrieval.staff_name}</strong> retrieved{" "}
              <strong>
                {retrieval.items?.length || 0} item{retrieval.items?.length !== 1 ? 's' : ''}
              </strong>
            </div>
            <small className="text-muted">
              {new Date(retrieval.retrieved_at).toLocaleString()}
            </small>
            {retrieval.items && (
              <div style={{ fontSize: '0.8em', marginTop: '4px' }}>
                {retrieval.items.slice(0, 2).map((item, idx) => (
                  <span key={idx} className="text-muted">
                    {item.product_name || item.product_id} x{item.qty}
                    {idx < Math.min(retrieval.items.length - 1, 1) ? ', ' : ''}
                  </span>
                ))}
                {retrieval.items.length > 2 && (
                  <span className="text-muted"> and {retrieval.items.length - 2} more...</span>
                )}
              </div>
            )}
          </div>
        </div>
      </ListGroup.Item>
    );
  };

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
        width: "400px",
        zIndex: 999,
        maxHeight: "500px",
      }}
    >
      <div className="p-2 border-bottom fw-bold d-flex justify-content-between align-items-center">
        <span>Notifications</span>
        <div>
          <span
            className="text-primary me-2"
            style={{ cursor: "pointer", fontWeight: 500, fontSize: '0.9em' }}
            onClick={markAllAsRead}
          >
            Mark all as read
          </span>
          <span
            className="text-primary"
            style={{ cursor: "pointer", fontWeight: 500, fontSize: '0.9em' }}
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
            active={activeTab === "inventory"}
            onClick={() => setActiveTab("inventory")}
            className="text-center position-relative"
            style={{ fontSize: "0.8rem", padding: "8px 4px" }}
          >
            Inventory
            {unreadInventoryCount > 0 && (
              <span 
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: '0.6rem' }}
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
                style={{ fontSize: '0.6rem' }}
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
      >
        <ListGroup variant="flush">
          {activeTab === "inventory" ? (
            logs.length === 0 ? (
              <ListGroup.Item className="text-center text-muted">
                No inventory notifications yet
              </ListGroup.Item>
            ) : (
              logs.map(renderInventoryLog)
            )
          ) : (
            retrievals.length === 0 ? (
              <ListGroup.Item className="text-center text-muted">
                No retrieval notifications yet
              </ListGroup.Item>
            ) : (
              retrievals.map(renderRetrievalLog)
            )
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
        {activeTab === "retrievals" && !hasMoreRetrievals && retrievals.length > 0 && (
          <div className="text-center text-muted py-2" style={{ fontSize: 12 }}>
            End of retrieval notifications
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;