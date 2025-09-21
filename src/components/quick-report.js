import { Button, Container, Modal } from "react-bootstrap";
import { Table, TableBody, TableHead, TableRow, TableCell } from "@mui/material";
import { BiSolidReport } from "react-icons/bi";
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const QuickReport = ({ refreshTrigger }) => {
    const [reportData, setReportData] = useState({
        totalCollections: 0,
        transactionCount: 0,
        voidedCount: 0
    });
    const [currentStaffName, setCurrentStaffName] = useState(""); // Add current staff name state
    const [showReportModal, setShowReportModal] = useState(false);
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [loading, setLoading] = useState(false);

    // Fetch report data for current staff
    const fetchReportData = async () => {
        try {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get staff name
            const { data: staff, error: staffError } = await supabase
                .from("staff")
                .select("staff_name")
                .eq("id", user.id)
                .single();

            if (staffError) throw staffError;

            // Get today's date range
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

            // Fetch transactions for today AND current staff
            const { data: transactions, error } = await supabase
                .from("transactions")
                .select("*")
                .gte("created_at", startOfDay)
                .lte("created_at", endOfDay)
                .eq("staff", staff.staff_name); // Filter by current staff

            if (error) throw error;

            const completed = transactions.filter(t => t.status === "completed");
            const voided = transactions.filter(t => t.status === "voided");

            setReportData({
                totalCollections: completed.reduce((sum, t) => sum + (t.total_amount || 0), 0),
                transactionCount: completed.length,
                voidedCount: voided.length
            });

            // Set current staff name for display
            setCurrentStaffName(staff.staff_name);

        } catch (err) {
            console.error("Error fetching report data:", err.message);
        }
    };

    // Fetch all transactions for void/history (filtered by current staff)
    const fetchTransactions = async () => {
        setLoading(true);
        try {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get staff name
            const { data: staff, error: staffError } = await supabase
                .from("staff")
                .select("staff_name")
                .eq("id", user.id)
                .single();

            if (staffError) throw staffError;

            const { data, error } = await supabase
                .from("transactions")
                .select(`
                    *,
                    transaction_items (
                        product_code,
                        qty,
                        price,
                        subtotal
                    ),
                    transaction_payments (
                        method,
                        amount
                    )
                `)
                .eq("staff", staff.staff_name) // Filter by current staff
                .order("created_at", { ascending: false })
                .limit(50); // Last 50 transactions for this staff

            if (error) throw error;
            setTransactions(data || []);
        } catch (err) {
            console.error("Error fetching transactions:", err.message);
        }
        setLoading(false);
    };

    // Void transaction
    const handleVoidTransaction = async (transactionId) => {
        if (!window.confirm("Are you sure you want to void this transaction? This action cannot be undone.")) {
            return;
        }

        try {
            setLoading(true);

            // Update transaction status to voided
            const { error: updateError } = await supabase
                .from("transactions")
                .update({ status: "voided" })
                .eq("id", transactionId);

            if (updateError) throw updateError;

            // TODO: Optionally restore product quantities here
            // You would need to fetch transaction_items and add back the quantities

            alert("Transaction voided successfully!");
            setShowVoidModal(false);
            fetchReportData();
            fetchTransactions();
        } catch (err) {
            console.error("Error voiding transaction:", err.message);
            alert("Failed to void transaction.");
        }
        setLoading(false);
    };

    // Initial load and refresh when transactions change
    useEffect(() => {
        fetchReportData();
    }, [refreshTrigger]);

    const handleViewReport = () => {
        fetchTransactions();
        setShowReportModal(true);
    };

    const handleVoid = () => {
        fetchTransactions();
        setShowVoidModal(true);
    };

    const handleHistory = () => {
        fetchTransactions();
        setShowHistoryModal(true);
    };

    return (
        <>
            <Container className="bg-white mx-1 my-2 rounded p-0" fluid>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                colSpan={2}
                                sx={{ fontWeight: "bold", fontSize: "1rem", borderBottom: "2px solid #ccc" }}
                            >
                                <BiSolidReport style={{ marginRight: "8px" }} />
                                My Quick Report
                                {currentStaffName && (
                                    <div style={{ fontSize: "0.8rem", fontWeight: "normal", color: "#666" }}>
                                        Staff: {currentStaffName}
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell sx={{ borderBottom: "1px solid #ddd" }}>
                                Total Collections
                            </TableCell>
                            <TableCell
                                align="right"
                                sx={{ borderBottom: "1px solid #ddd" }}
                            >
                                ₱{reportData.totalCollections.toFixed(2)}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ borderBottom: "1px solid #ddd" }}>
                                # of Transactions
                            </TableCell>
                            <TableCell
                                align="right"
                                sx={{ borderBottom: "1px solid #ddd" }}
                            >
                                {reportData.transactionCount}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ borderBottom: "1px solid #ddd" }}>
                                # of Voided Transaction
                            </TableCell>
                            <TableCell
                                align="right"
                                sx={{ borderBottom: "1px solid #ddd" }}
                            >
                                {reportData.voidedCount}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                {/* Buttons stacked vertically */}
                <div className="d-flex flex-column p-3">
                    <Button className="mb-2" onClick={handleViewReport}>
                        View Report
                    </Button>
                    <Button className="mb-2" variant="danger" onClick={handleVoid}>
                        Void
                    </Button>
                    <Button className="mb-2" variant="secondary" onClick={handleHistory}>
                        History
                    </Button>
                </div>
            </Container>

            {/* View Report Modal */}
            <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Daily Report</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <h6>Summary</h6>
                        <p><strong>Total Collections:</strong> ₱{reportData.totalCollections.toFixed(2)}</p>
                        <p><strong>Completed Transactions:</strong> {reportData.transactionCount}</p>
                        <p><strong>Voided Transactions:</strong> {reportData.voidedCount}</p>
                    </div>
                    
                    <h6>Recent Transactions</h6>
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell>{t.id}</TableCell>
                                            <TableCell>
                                                {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString()}
                                            </TableCell>
                                            <TableCell>₱{t.total_amount.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <span className={`badge ${t.status === 'completed' ? 'bg-success' : 'bg-danger'}`}>
                                                    {t.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </Modal.Body>
            </Modal>

            {/* Void Modal */}
            <Modal show={showVoidModal} onHide={() => setShowVoidModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Void Transaction</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-warning">⚠️ Select a transaction to void. This action cannot be undone.</p>
                    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Action</TableCell>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.filter(t => t.status === 'completed').map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell>
                                                <Button 
                                                    size="sm" 
                                                    variant="danger"
                                                    onClick={() => handleVoidTransaction(t.id)}
                                                    disabled={loading}
                                                >
                                                    Void
                                                </Button>
                                            </TableCell>
                                            <TableCell>{t.id}</TableCell>
                                            <TableCell>
                                                {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString()}
                                            </TableCell>
                                            <TableCell>₱{t.total_amount.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <span className="badge bg-success">{t.status}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </Modal.Body>
            </Modal>

            {/* History Modal */}
            <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>Transaction History</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ maxHeight: "500px", overflowY: "auto" }}>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Items</TableCell>
                                        <TableCell>Payment Methods</TableCell>
                                        <TableCell>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell>{t.id}</TableCell>
                                            <TableCell>
                                                {new Date(t.created_at).toLocaleDateString()}<br/>
                                                <small>{new Date(t.created_at).toLocaleTimeString()}</small>
                                            </TableCell>
                                            <TableCell>₱{t.total_amount.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {t.transaction_items?.map((item, idx) => (
                                                    <div key={idx} style={{ fontSize: '0.8rem' }}>
                                                        {item.product_code} x{item.qty}
                                                    </div>
                                                ))}
                                            </TableCell>
                                            <TableCell>
                                                {t.transaction_payments?.map((payment, idx) => (
                                                    <div key={idx} style={{ fontSize: '0.8rem' }}>
                                                        {payment.method}: ₱{payment.amount.toFixed(2)}
                                                    </div>
                                                ))}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`badge ${t.status === 'completed' ? 'bg-success' : 'bg-danger'}`}>
                                                    {t.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default QuickReport;