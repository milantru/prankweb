type Props = {
    errorMessages: string[] | string;
    onClose: () => void;
};

function ErrorMessageBox({ errorMessages, onClose }: Props) {
    if (!Array.isArray(errorMessages)) {
        errorMessages = [errorMessages as string];
    }

    return (
        <div className="container-fluid mb-4">
            <div className="row justify-content-center">
                <div className="col-12 col-md-10 col-xl-8">
                    <div
                        className="alert position-relative border border-danger" style={{ backgroundColor: "#eee" }}>
                        <button
                            className="py-0 px-2 btn btn-sm btn-link position-absolute"
                            style={{
                                fontSize: "1.5rem",
                                color: "#333",
                                background: "none",
                                border: "none",
                                top: "-2px",
                                right: "0px"
                            }}
                            onClick={onClose}>
                            &times; {/* This is the "X" character */}
                        </button>

                        <p className="mb-0 text-center">
                            {errorMessages.map(errorMessage => (<>{errorMessage}<br /></>))}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ErrorMessageBox;
