import {
  Container,
  InputGroup,
  FormControl,
  Image,
} from "react-bootstrap";
import { IoIosSearch } from "react-icons/io";
import { IoMdNotificationsOutline } from "react-icons/io";
import logo from "../logo.png";

const Header = () => {
  return (
    <Container
      fluid
      className="bg-white d-flex align-items-center justify-content-between w-100"
      style={{ height: "70px"}}
    >
      {/* Left: Search bar */}
      <InputGroup style={{ maxWidth: "600px", border: "1px solid #ced4da", borderRadius: "0.375rem" }}>
        <InputGroup.Text style={{ background: "white", border: "none" }}>
          <IoIosSearch />
        </InputGroup.Text>
        <FormControl
          type="search"
          placeholder="Search..."
          style={{
            border: "none",
            boxShadow: "none",
            background: "white",
          }}
        />
      </InputGroup>

      {/* Right: Notification + Avatar */}
      <div className="d-flex align-items-center">
        <IoMdNotificationsOutline
          size={28}
          style={{ marginRight: "20px", cursor: "pointer" }}
        />
        <Image
          src={logo}
          style={{
            width: "45px",
            height: "45px",
            borderRadius: "50%",
            objectFit: "cover",
            cursor: "pointer",
          }}
        />
      </div>
    </Container>
  );
};

export default Header;
