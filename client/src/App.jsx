import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import CSDashboard from "./pages/CSDashboard";
import Devices from "./pages/Devices";
import Chat from "./pages/Chats";
import AISettings from "./pages/AISettings";
import Agents from "./pages/Agents";
import Gallery from "./pages/Gallery";
import MobileMenu from "./pages/MobileMenu";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  const isMobile = window.innerWidth < 1024;
  
  if (isMobile) return <Navigate to="/menu" />;
  if (user?.role === 'agent') return <Navigate to="/chats" />;
  return <Navigate to="/dashboard" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Full Screen Pages (No Dashboard Layout) */}
          <Route path="/devices/:deviceId/chats" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />

          {/* Dashboard Pages */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardRedirect />} />
            <Route path="menu" element={<MobileMenu />} />
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={['user', 'superadmin']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="cs-dashboard" element={<CSDashboard />} />
            <Route path="devices" element={
              <ProtectedRoute allowedRoles={['user', 'superadmin']}>
                <Devices />
              </ProtectedRoute>
            } />
            <Route path="devices/:deviceId/ai-settings" element={
              <ProtectedRoute allowedRoles={['user', 'superadmin']}>
                <AISettings />
              </ProtectedRoute>
            } />
            <Route path="agents" element={
              <ProtectedRoute allowedRoles={['user', 'superadmin']}>
                <Agents />
              </ProtectedRoute>
            } />
             <Route path="chats" element={
               <ProtectedRoute>
                 <Chat />
               </ProtectedRoute>
             } />
            <Route path="gallery" element={
              <ProtectedRoute allowedRoles={['user', 'superadmin']}>
                <Gallery />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
