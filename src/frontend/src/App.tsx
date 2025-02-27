import { Route, Routes } from "react-router-dom";
import Home from "./pages/home/Home";
import NotFound from "./pages/not-found/NotFound";
import AnalyticalPage from "./pages/analytical-page/AnalyticalPage";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />}></Route>
            <Route path="/analytical-page" element={<AnalyticalPage />}></Route>
            <Route path="*" element={<NotFound />}></Route>
        </Routes>
    )
}

export default App;
