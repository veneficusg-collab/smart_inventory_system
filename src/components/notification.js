import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { ListGroup, Spinner } from "react-bootstrap";

const PAGE_SIZE = 20; // how many logs per page

const Notifications = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);       // first load
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);            // next offset to fetch
  const [hasMore, setHasMore] = useState(true);       // whether there is more to fetch
  const scrollRef = useRef(null);

  // ---- helpers ----
  const dedupeById = (items) => {
    const seen = new Set();
    return items.filter((x) => {
      if (seen.has(x.id)) return false;
      seen.add(x.id);
      return true;
    });
  };

  const fetchPage = useCallback(
    async (startOffset) => {
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
      setHasMore(got === PAGE_SIZE); // if we got a full page, there might be more
    },
    []
  );

  // initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchPage(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchPage]);

  // realtime inserts
  useEffect(() => {
    const channel = supabase
      .channel("logs-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        (payload) => {
          setLogs((prev) => dedupeById([payload.new, ...prev]));
          // keep the list size sane by trimming a bit (optional)
          setOffset((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // load more when scrolling near bottom
  const onScroll = async (e) => {
    const el = e.currentTarget;
    const nearBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 24; // 24px threshold

    if (nearBottom && hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      try {
        await fetchPage(offset);
      } finally {
        setLoadingMore(false);
      }
    }
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
        width: "320px",
        zIndex: 999,
        maxHeight: "420px",
      }}
    >
      <div className="p-2 border-bottom fw-bold d-flex justify-content-between align-items-center">
        <span>Notifications</span>
        <span
          className="text-primary"
          style={{ cursor: "pointer", fontWeight: 500 }}
          onClick={onClose}
        >
          Close
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{ overflowY: "auto", maxHeight: "370px" }}
      >
        <ListGroup variant="flush">
          {logs.length === 0 ? (
            <ListGroup.Item>No notifications yet</ListGroup.Item>
          ) : (
            logs.map((log) => (
              <ListGroup.Item key={log.id}>
                <div>
                  <strong>{log.staff}</strong> {log.product_action}{" "}
                  <strong>{log.product_name}</strong>
                </div>
                <small className="text-muted">
                  {new Date(log.created_at).toLocaleString()}
                </small>
              </ListGroup.Item>
            ))
          )}
        </ListGroup>

        {/* loader at bottom when fetching next page */}
        {loadingMore && (
          <div className="d-flex justify-content-center py-2">
            <Spinner animation="border" size="sm" />
          </div>
        )}
        {!hasMore && logs.length > 0 && (
          <div className="text-center text-muted py-2" style={{ fontSize: 12 }}>
            End of notifications
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
