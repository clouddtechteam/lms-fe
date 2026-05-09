import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Login from '../pages/Login.jsx';
import StudentDashboard from '../pages/StudentDashboard.jsx';
import TrainerDashboard from '../pages/TrainerDashboard.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import AdminBatches from '../pages/admin/Batches.jsx';
import AdminTrainers from '../pages/admin/Trainers.jsx';
import AdminStudents from '../pages/admin/Students.jsx';
import LiveClass from '../pages/LiveClass.jsx';
import StudentClasses from '../pages/student/Classes.jsx';
import TrainerClasses from '../pages/trainer/Classes.jsx';



// Protected route — redirect to /login if not authenticated
const PrivateRoute = ({ children, allowedRoles }) => {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Redirect logged-in users away from login page to their dashboard
const PublicRoute = ({ children }) => {
  const { token, role } = useAuth();
  if (token) {
    const map = { admin: '/admin', trainer: '/trainer', student: '/student' };
    return <Navigate to={map[role] || '/login'} replace />;
  }
  return children;
};

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/student"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/trainer"
        element={
          <PrivateRoute allowedRoles={['trainer']}>
            <TrainerDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/batches"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminBatches />
          </PrivateRoute>
        }
      />


      <Route
        path="/admin/students"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminStudents />
          </PrivateRoute>
        }
      />
      <Route
        path="/live/:batchId"
        element={
          <PrivateRoute allowedRoles={['admin', 'trainer', 'student']}>
            <LiveClass />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/trainers"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminTrainers />
          </PrivateRoute>
        }
      />
      <Route
        path="/student/classes"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentClasses />
          </PrivateRoute>
        }
      />
      <Route
        path="/trainer/classes"
        element={
          <PrivateRoute allowedRoles={['trainer']}>
            <TrainerClasses />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
