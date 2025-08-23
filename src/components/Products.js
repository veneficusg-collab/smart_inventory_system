import { Row,Col } from "react-bootstrap";
import OverallInventory from "./overall-inventory";
import ProductTable from "./product-table";

const Products = () => {
    return ( <div>

        <Row>
        <Col>
          <OverallInventory />
        </Col>
      </Row>
      <Row>
        <Col>
          <ProductTable />
        </Col>
      </Row>
    </div> );
}
 
export default Products;