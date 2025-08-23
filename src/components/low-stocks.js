import { Badge, Image } from "react-bootstrap";
import Food from "../petfood.webp";
const LowStocks = () => {
  return (
    <div className="bg-white mx-3 my-4 rounded p-0" style={{ height: "270px" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mx-2 mb-3">
        <span className="mx-1 mt-3 d-inline-block">Near Expiration</span>
        <a className="mt-3 mx-2">See All</a>
      </div>

      {/* Item Row */}
      <div className="d-flex align-items-center justify-content-between my-2 w-100 px-2 border-top py-1">
        {/* Left: Image + Info */}
        <div className="d-flex align-items-center mt-1">
          <Image src={Food} style={{ width: "50px", height: "50px" }} rounded />
          <div className="ms-2">
            <div className="fw-bold">Pet Food</div>
            <small className="text-muted">Remaining: 10 Packets</small>
          </div>
        </div>

        {/* Right: Badge */}
        <Badge bg="danger" pill>
          Low
        </Badge>
      </div>
      <div className="d-flex align-items-center justify-content-between my-2 w-100 px-2 border-top py-1">
        {/* Left: Image + Info */}
        <div className="d-flex align-items-center mt-1">
          <Image src={Food} style={{ width: "50px", height: "50px" }} rounded />
          <div className="ms-2">
            <div className="fw-bold">Pet Food</div>
            <small className="text-muted">Remaining: 10 Packets</small>
          </div>
        </div>

        {/* Right: Badge */}
        <Badge bg="danger" pill>
          Low
        </Badge>
      </div>
      <div className="d-flex align-items-center justify-content-between my-2 w-100 px-2 border-top py-1">
        {/* Left: Image + Info */}
        <div className="d-flex align-items-center mt-1">
          <Image src={Food} style={{ width: "50px", height: "50px" }} rounded />
          <div className="ms-2">
            <div className="fw-bold">Pet Food</div>
            <small className="text-muted">Remaining: 10 Packets</small>
          </div>
        </div>

        {/* Right: Badge */}
        <Badge bg="danger" pill>
          Low
        </Badge>
      </div>
    </div>
  );
};

export default LowStocks;
