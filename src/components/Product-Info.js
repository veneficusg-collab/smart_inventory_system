import Table from "@mui/material/Table";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { Container, Row, Col, Form, Button, Image } from "react-bootstrap";
import { MdOutlineModeEdit } from "react-icons/md";
import TableBody from "@mui/material/TableBody";
import logo from "../petfood.webp";

const ProductInfo = () => {
  return (
    <Container
      fluid
      className="bg-white m-5 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4 mt-3 px-2">
        <span className="h4 mb-0">Maggi</span>
        <Button variant="outline-secondary" size="sm">
          <MdOutlineModeEdit /> Edit{" "}
        </Button>
      </div>
      <div>
        <span className="mx-2 border-bottom border-primary border-1">
          Overview
        </span>
        <hr style={{ marginTop: "-2px" }} className="mx-2"></hr>
      </div>
      <Row>
        <Col md={6}>
          <span className="mx-5">Primary Details</span>
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product name</span>
            <span>Pet One</span>
          </div>
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product name</span>
            <span>Pet One</span>
          </div>
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product name</span>
            <span>Pet One</span>
          </div>
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product name</span>
            <span>Pet One</span>
          </div>
          <div className="mt-5 mx-5">
            <span>Supplier Details</span>
          </div>
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product name</span>
            <span>Pet One</span>
          </div>
          <div className="d-flex justify-content-between align-items-center mx-5 my-3">
            <span>Product name</span>
            <span>Pet One</span>
          </div>
        </Col>
        <Col md={6}>
          <div className="mx-5 d-flex align-items-start">
            <div
              className="mt-3 border rounded d-flex align-items-center justify-content-center"
              style={{
                height: "200px",
                width: "200px",
                backgroundColor: "#f8f9fa",
                border: "2px dashed #dee2e6",
              }}
            >
              {/* You can replace this with an actual image */}
              <div className="text-center text-muted ">
                <Image src={logo} style={{ height: "180px" }} />
              </div>
            </div>
            <div className="ms-3 mt-4 d-flex flex-column">
              <div className="my-3 d-flex justify-content-between" style={{ width: "200px" }}>
                <span>Opening Stock</span>
                <span>40</span>
              </div>
              <div className="my-3 d-flex justify-content-between" style={{ width: "200px" }}>
                <span>Current Stock</span>
                <span>35</span>
              </div>
              <div className="my-3 d-flex justify-content-between" style={{ width: "200px" }}>
                <span>Reserved Stock</span>
                <span>5</span>
              </div>
            </div>
          </div>
        </Col>
      </Row>
      <Row>
        <Col md={8}>
          <TableContainer
            component={Paper}
            className="my-3"
            sx={{ maxHeight: 200 }}
          >
            <Table
              stickyHeader
              sx={{ width: "100%" }}
              aria-label="simple table"
            >
              <TableHead>
                <TableRow>
                  <TableCell align="left" sx={{ backgroundColor: "#f5f5f5" }}>
                    Store Name
                  </TableCell>
                  <TableCell align="right" sx={{ backgroundColor: "#f5f5f5" }}>
                    Stock in hand
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell align="left">
                    <span>Butuan Branch</span>
                  </TableCell>
                  <TableCell align="right">
                    <span>15</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell align="left">
                    <span>Davao Branch</span>
                  </TableCell>
                  <TableCell align="right">
                    <span>19</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Col>
        <Col md={4} className="d-flex flex-column">
              <div style={{height:"100px"}} className="my-3">
                <Image src={logo} style={{ height: "100px", width:"350px", borderRadius:"10px"}} />
              </div>
              <div className="mt-1  d-flex justify-content-center">
                <Button variant="primary" size="sm">Download Barcode</Button>
              </div>
        </Col>
      </Row>
      {/* Form content - takes available space */}
    </Container>
  );
};

export default ProductInfo;