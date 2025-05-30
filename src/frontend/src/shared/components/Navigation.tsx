import { Link } from "react-router-dom";

function Navigation() {
    return (
        <nav role="navigation" aria-label="main" className="navbar navbar-expand-md navbar-light bg-light">
            <div className="container" id="navigation">
                <Link className="navbar-brand" to="/">
                    <img src="assets/images/logo.svg" style={{ height: "1.4em" }} alt="Logo" />
                </Link>
                <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#mainNavBar"
                    aria-controls="mainNavBar" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="mainNavBar">
                    <ul className="navbar-nav ml-auto mb-2 mb-md-0">
                        <li className="nav-item">
                            <Link className="nav-link" to="/">Home</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/about">About</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/help">Help</Link>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/openapi/">API Docs</a>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link"
                                to="https://github.com/milantru/prankweb/issues/new/choose"
                                target="_blank"
                                rel="noopener noreferrer">
                                Report issue
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navigation;
