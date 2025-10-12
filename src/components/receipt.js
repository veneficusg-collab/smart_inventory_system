import React from "react";

const Receipt = ({ transaction }) => {
  const handlePrint = () => window.print();

  return (
    <div
      id="receipt-root"
      style={{
        fontFamily: "monospace",
        width: "80mm",
        margin: "auto",
        padding: "10px",
        fontSize: "12px",
      }}
    >
      <h4 style={{ textAlign: "center", marginBottom: "5px" }}>
        🐾 Pet Matters
      </h4>
      <p style={{ textAlign: "center", margin: 0 }}>123 Main St, City</p>
      <p style={{ textAlign: "center", margin: 0 }}>Tel: 0999-999-9999</p>
      <hr />

      <p><strong>Transaction ID:</strong> {transaction.id}</p>
      <p><strong>Date:</strong> {new Date(transaction.date).toLocaleString()}</p>

      <hr />
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th align="left">Item</th>
            <th align="right">Qty</th>
            <th align="right">Price</th>
          </tr>
        </thead>
        <tbody>
          {transaction.items.map((item, idx) => (
            <tr key={idx}>
              <td>{item.name}</td>
              <td align="right">{item.qty}</td>
              <td align="right">₱{(item.price * item.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr />
      {transaction.discountType && (
        <p>
          {transaction.discountType} Discount: -₱
          {transaction.discountAmount.toFixed(2)}
        </p>
      )}
      <p>
        <strong>Total: ₱{transaction.total.toFixed(2)}</strong>
      </p>
      <p>Payment Method: {transaction.payments.map(p => p.method).join(", ")}</p>
      <p>Amount Paid: ₱{transaction.payments.reduce((sum,p)=>sum+p.amount,0).toFixed(2)}</p>
      <p>Change: ₱{transaction.change.toFixed(2)}</p>
      <hr />
      <p style={{ textAlign: "center" }}>Thank you for your purchase!</p>

      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "10px",
          gap: "8px",
        }}
      >
        <button onClick={handlePrint}>🖨 Print</button>
        <button onClick={() => window.close()}>Close</button>
      </div>
    </div>
  );
};

export default Receipt;
