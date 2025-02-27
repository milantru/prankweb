import { Link } from "react-router-dom";

function NotFound() {
    return (
        <>
            <p>404: Page not found</p>
            <Link to="/">Please go home</Link>
        </>
    )
}

export default NotFound;
