import { Image } from "react-bootstrap";
import LoginForm from "../components/login-form";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

const Login = () => {
  return (
    <Container className="bg-danger " fluid>
          <LoginForm />

    </Container>
  );
};

export default Login;
