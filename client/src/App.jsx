import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import Landing from "./pages/Landing";
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
import ChatHistoryArchive from "./pages/ChatHistoryArchive";
import ProductManager from "./components/products/ProductManager";
import { ModalProvider } from "./context/ModalContext";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app" />;
  }
  
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  const isMobile = window.innerWidth < 1024;
  
  if (isMobile) return <Navigate to="/app/menu" />;
  if (user?.role === 'agent') return <Navigate to="/app/chats" />;
  return <Navigate to="/app/dashboard" />;
};

const RedirectToDeviceChats = () => {
  const { deviceId } = useParams();
  return <Navigate to={`/app/devices/${deviceId}/chats`} replace />;
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ModalProvider>
          <Router>
            <AuthProvider>
              <Routes>
                {/* Public Pages */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/devices/:deviceId/chats" element={<RedirectToDeviceChats />} />
                <Route path="/chats" element={<Navigate to="/app/chats" replace />} />
                <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/devices" element={<Navigate to="/app/devices" replace />} />
                <Route path="/agents" element={<Navigate to="/app/agents" replace />} />
                <Route path="/gallery" element={<Navigate to="/app/gallery" replace />} />
                <Route path="/cs-dashboard" element={<Navigate to="/app/cs-dashboard" replace />} />
                <Route path="/chat-history" element={<Navigate to="/app/chat-history" replace />} />
                
                {/* Full Screen Pages (No Dashboard Layout) */}
                <Route path="/app/devices/:deviceId/chats" element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                } />

                {/* Dashboard Pages */}
                <Route path="/app" element={
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
                  <Route path="devices/:deviceId/products" element={
                    <ProtectedRoute allowedRoles={['user', 'superadmin']}>
                      <ProductManager />
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
                  <Route path="chat-history" element={
                    <ProtectedRoute allowedRoles={['user', 'superadmin']}>
                      <ChatHistoryArchive />
                    </ProtectedRoute>
                  } />
                </Route>
              </Routes>
            </AuthProvider>
          </Router>
        </ModalProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
