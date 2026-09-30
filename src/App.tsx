import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GlobalContextProviders } from "./components/_globalContextProviders";
import { routes } from "./routes.generated";

export function App() {
  return (
    <BrowserRouter>
      <GlobalContextProviders>
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </GlobalContextProviders>
    </BrowserRouter>
  );
}
