// Order.jsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  TextField,
  IconButton,
} from "@mui/material";
import { Container, Image } from "react-bootstrap";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { RiDeleteBackLine } from "react-icons/ri";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

const Order = ({ orders, onQtyChange, onDelete }) => {
  const [imageMap, setImageMap] = useState({}); // { product_ID: publicUrl }

  // Build a set of product_IDs present in the order
  const productIds = useMemo(
    () => Array.from(new Set(orders.map((o) => o.product_ID))).filter(Boolean),
    [orders]
  );

  // Fetch images for products in the current order
  useEffect(() => {
    const loadImages = async () => {
      if (productIds.length === 0) return;

      const { data, error } = await supabase
        .from("products")
        .select("product_ID, product_img")
        .in("product_ID", productIds);

      if (error) {
        console.error("Order image fetch error:", error);
        return;
      }

      const map = {};
      (data || []).forEach((p) => {
        if (!p.product_img) {
          map[p.product_ID] = "";
          return;
        }
        if (typeof p.product_img === "string" && p.product_img.startsWith("http")) {
          map[p.product_ID] = p.product_img;
        } else {
          const { data: pub } = supabase
            .storage
            .from(BUCKET)
            .getPublicUrl(`products/${p.product_img}`);
          map[p.product_ID] = pub?.publicUrl || "";
        }
      });

      setImageMap((prev) => ({ ...prev, ...map }));
    };

    loadImages();
  }, [productIds]);

  const total = orders.reduce((sum, o) => sum + o.qty * o.price, 0);

  return (
    <Container className="bg-white mx-2 my-2 rounded p-0" fluid>
      <TableContainer component={Paper} style={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ "& th": { py: 0.5, fontSize: "0.85rem" } }}>
              <TableCell style={{ fontWeight: "bold" }}>Order</TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell /> {/* delete col */}
            </TableRow>
            <TableRow sx={{ "& th": { py: 0.5, fontSize: "0.8rem" } }}>
              <TableCell>Image</TableCell>
              <TableCell>Product Name</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Total</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>

          <TableBody>
            {orders.map((order, idx) => (
              <TableRow
                key={`${order.product_ID}-${idx}`}
                sx={{
                  "& td": { py: 0.3, fontSize: "0.8rem" },
                  "&:hover .delete-btn": { opacity: 1 },
                }}
              >
                {/* Image */}
                <TableCell>
                  {imageMap[order.product_ID] ? (
                    <Image
                      src={imageMap[order.product_ID]}
                      rounded
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "cover",
                        border: "1px solid #eee",
                      }}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 6,
                        background: "#f1f3f5",
                        border: "1px dashed #dee2e6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#868e96",
                      }}
                    >
                      No Image
                    </div>
                  )}
                </TableCell>

                {/* Product Name */}
                <TableCell>{order.product_name}</TableCell>

                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={order.qty}
                    onChange={(e) => onQtyChange(idx, e.target.value)}
                    inputProps={{
                      min: 0,
                      style: { width: "55px", padding: "2px 6px" },
                    }}
                  />
                </TableCell>
                <TableCell>₱{order.price.toFixed(2)}</TableCell>
                <TableCell>₱{(order.qty * order.price).toFixed(2)}</TableCell>
                <TableCell align="center" width={40}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(idx)}
                    className="delete-btn"
                    sx={{ opacity: 0, transition: "opacity 0.2s" }}
                  >
                    <RiDeleteBackLine fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {/* Footer Row */}
            <TableRow sx={{ "& td": { py: 0.5, fontSize: "0.85rem" } }}>
              <TableCell colSpan={4} style={{ textAlign: "right", fontWeight: "bold" }}>
                Total
              </TableCell>
              <TableCell style={{ fontWeight: "bold" }}>₱{total.toFixed(2)}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Order;
