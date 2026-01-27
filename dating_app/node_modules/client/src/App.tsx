import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Pool from './pages/Pool';
import Windows from './pages/Windows';
import WindowDetail from './pages/WindowDetail';

// Placeholder components if they don't exist yet (to allow build)
// Note: I will create them next.

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-stone-100 text-stone-800 font-sans">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login isSignup={false} />} />
            <Route path="/signup" element={<Login isSignup={true} />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pool" element={<Pool />} />
              <Route path="/windows" element={<Windows />} />
              <Route path="/windows/:id" element={<WindowDetail />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
