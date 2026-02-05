import { Layout } from "./components/Layout";
import { Navigate, Route, Routes } from "react-router-dom";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import type { ReactNode } from "react";
import { useAuthStore } from "./stores/auth";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { Transactions } from "./pages/Transactions";
import { RecoverPassword } from "./pages/RecoverPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Categories } from "./pages/Category";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to='/' replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to='/' replace />;
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Layout isAuthenticated={isAuthenticated}>
      <Routes>
        <Route
          path='/'
          element={
            isAuthenticated ? (
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            ) : (
              <PublicRoute>
                <Login />
              </PublicRoute>
            )
          }
        />
        <Route
          path='/signup'
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path='/recover-password'
          element={
            <PublicRoute>
              <RecoverPassword />
            </PublicRoute>
          }
        />
        <Route
          path='/reset-password'
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        <Route
          path='/profile'
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path='/categories'
          element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path='/transactions'
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
