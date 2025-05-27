import { Route, Routes } from "react-router-dom";
import Home from "./pages/home/Home";
import NotFound from "./pages/not-found/NotFound";
import AnalyticalPage from "./pages/analytical-page/AnalyticalPage";
import About from "./pages/about/About";
import Help from "./pages/help/Help";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Home />}></Route>
            <Route path="/analytical-page" element={<AnalyticalPage />}></Route>
            <Route path="/about" element={<About />}></Route>
            <Route path="/help" element={<Help />}></Route>
            <Route path="/not-found" element={<NotFound />}></Route>
            <Route path="*" element={<NotFound />}></Route>
        </Routes>
    )
}

export default App;
