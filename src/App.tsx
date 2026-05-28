import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Public from './pages/Public';
import Navbar from './components/Navbar';
import { Loader2 } from 'lucide-react';

/**
 * Higher-order component to guard and secure private panel pages.
 * Loads the core Navbar only for authenticated layouts.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] text-zinc-100 flex flex-col justify-center items-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#6ee7b7] animate-spin" />
        <span className="font-mono text-xs text-zinc-500">Securing environment...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0d0d0f]">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}

/**
 * Route controller for standard authenticated redirections.
 */
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // hide flash transitions
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login/register forms */}
          <Route
            path="/login"
            element={
              <AuthRoute>
                <Login />
              </AuthRoute>
            }
          />

          {/* Unauthenticated public stats details */}
          <Route path="/public/:shortCode" element={<Public />} />

          {/* Protected links lists and dashboard adjustments */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected URL telemetry metrics */}
          <Route
            path="/analytics/:id"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback defaultings */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      
      {/* Universal toast popup alerts */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#121215',
            color: '#ececee',
            border: '1px solid #27272a',
            fontSize: '12px',
            fontFamily: 'monospace'
          },
          success: {
            iconTheme: {
              primary: '#6ee7b7',
              secondary: '#121215'
            }
          },
          error: {
            iconTheme: {
              primary: '#fb7185',
              secondary: '#121215'
            }
          }
        }}
      />
    </AuthProvider>
  );
}
