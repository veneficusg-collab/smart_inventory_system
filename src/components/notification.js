import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { ListGroup, Spinner } from "react-bootstrap";

const Notifications = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("logs")
      .select("id, product_name, product_action, staff, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    // ✅ Realtime subscription for new logs
    const channel = supabase
      .channel("logs-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        (payload) => {
          setLogs((prev) => [payload.new, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return <div className="p-3"><Spinner animation="border" size="sm" /></div>;

  return (
    <div
      className="position-absolute bg-white shadow rounded"
      style={{
        top: "60px",
        right: "20px",
        width: "300px",
        zIndex: 999,
      }}
    >
      <div className="p-2 border-bottom fw-bold">Notifications</div>
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
      <div
        className="text-center text-primary p-2"
        style={{ cursor: "pointer" }}
        onClick={onClose}
      >
        Close
      </div>
    </div>
  );
};

export default Notifications;
