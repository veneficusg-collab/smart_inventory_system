import { Col, Container, Card, Row, Button } from "react-bootstrap";
import { Plus } from "lucide-react";
import { FaShoppingCart } from "react-icons/fa";
import { useEffect, useState } from "react";
import BarcodeModal from "./barcode-modal";
import { Modal,Form,InputGroup } from "react-bootstrap";
import { LuScanBarcode } from "react-icons/lu";
import { supabase } from "../supabaseClient";



const StaffDashboard = ({ setRender, setScannedId }) => {
  const [staffRender, setStaffRender] = useState("dashboard");
  const [barcodeModalShow, setBarcodeModalShow] = useState(false);
  const [productId, setProductId] = useState("");

    const [restockModal, setRestockModal] = useState(false);
    const [unstockModal, setUnstockModal] = useState(false);

  const handleRestockButton = async (productId) => {
    
    let { data: products, error } = await supabase
      .from('products')
      .select('product_ID')
      .eq('product_ID', productId);

      console.log(products);

      if(error){
        alert(error);
      }
      if(products){
        setScannedId(productId);
        setRender('Restock');
      } else {
        console.log('ID not Found');
      }
  };

  const handleUnstockButton = async (productId) => {
    
    let { data: products, error } = await supabase
      .from('products')
      .select('product_ID')
      .eq('product_ID', productId);

      console.log(products);

      if(error){
        alert(error);
      }
      if(products){
        setScannedId(productId);
        setRender('Unstock');
      } else {
        console.log('ID not Found');
      }
  };

  // const handleCheck = (productId) => {

  //   setID(productId); // object, not array
  //   setRender(renderState); // switch immediately
  // };

  return (
    <Container fluid className="p-4" style={{ height: "86vh" }}>
      {barcodeModalShow && (
        <BarcodeModal
          show={barcodeModalShow}
          setBarcodeModalShow={setBarcodeModalShow}
          setProductId={setProductId}
        />
      )}
      <Modal show={restockModal} onHide={() => setRestockModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Restock</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group as={Row} className="mb-3 mt-4" controlId="formProductId">
            <Form.Label column sm={3} className="text-start">
              Product ID
            </Form.Label>
            <Col sm={9}>
              <InputGroup size="sm">
                <Form.Control
                  type="text"
                  placeholder="Enter product ID"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setBarcodeModalShow(true)}
                >
                  <LuScanBarcode />
                </Button>
              </InputGroup>
            </Col>
          </Form.Group>
        </Modal.Body>

        {/* Footer with right-aligned buttons */}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRestockModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleRestockButton(productId)}>
            Check
          </Button>
        </Modal.Footer>
      </Modal>
<Modal show={unstockModal} onHide={() => setUnstockModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Unstock</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group as={Row} className="mb-3 mt-4" controlId="formProductId">
            <Form.Label column sm={3} className="text-start">
              Product ID
            </Form.Label>
            <Col sm={9}>
              <InputGroup size="sm">
                <Form.Control
                  type="text"
                  placeholder="Enter product ID"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setBarcodeModalShow(true)}
                >
                  <LuScanBarcode />
                </Button>
              </InputGroup>
            </Col>
          </Form.Group> 
        </Modal.Body>

        {/* Footer with right-aligned buttons */}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setUnstockModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleUnstockButton(productId)}>
            Check
          </Button>
        </Modal.Footer>
      </Modal>

      <Row
        className="justify-content-center align-items-center"
        style={{ height: "100%" }} // 🔹 make row full height
      >
        {/* Restock */}
        <Col md={5} className="mb-4" style={{ height: "40vh" }}>
          <Card className="shadow-sm text-center p-4 h-100 d-flex justify-content-center align-items-center mx-auto">
            <h5 className="mb-3">Restock</h5>
            <Button
              variant="primary"
              className="d-flex justify-content-center align-items-center mx-auto"
              style={{ width: "80px", height: "80px", borderRadius: "12px" }}
              onClick={() => setRestockModal(true)}
            >
              <Plus size={40} />
            </Button>
          </Card>
        </Col>

        {/* Unstock */}
        <Col md={5} className="mb-4" style={{ height: "40vh" }}>
          <Card className="shadow-sm text-center p-4 h-100 d-flex justify-content-center align-items-center mx-auto">
            <h5 className="mb-3">Unstock</h5>
            <Button
              variant="light"
              className="d-flex justify-content-center align-items-center mx-auto"
              style={{ width: "80px", height: "80px", borderRadius: "12px" }}
              onClick={() => setUnstockModal(true)}
            >
              <FaShoppingCart size={40} />
            </Button>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default StaffDashboard;
