function Navigation() {
    return (
        <nav role="navigation" aria-label="main" className="navbar navbar-expand-md navbar-light bg-light">
            <div className="container" id="navigation">
                <a className="navbar-brand" href="./">
                    <img src="assets/images/logo-p2rank.svg" style={{ height: "1.4em" }} alt="Logo" />
                </a>
                <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#mainNavBar"
                    aria-controls="mainNavBar" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="mainNavBar">
                    <ul className="navbar-nav ml-auto mb-2 mb-md-0">
                        <li className="nav-item">
                            <a className="nav-link" href="/">Home</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/about">About</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/help">Help</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link"
                                href="https://github.com/milantru/prankweb/issues/new/choose"
                                target="_blank"
                                rel="noopener noreferrer">
                                Report issue
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navigation;
