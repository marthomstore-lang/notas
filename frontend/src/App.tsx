import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './views/Login';
import { AdminDashboard } from './views/AdminDashboard';
import { TeacherDashboard } from './views/TeacherDashboard';
import { GradesSheet } from './components/Grades/GradesSheet';
import { TeacherGradesSheetWrapper } from './components/Grades/TeacherGradesSheetWrapper';
import { A11yProvider } from './context/A11yContext';
import { MigrationNotice } from './components/MigrationNotice/MigrationNotice';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole: string }) => {
    const { user } = useAuth();
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    const hasAccess = user.role === allowedRole || (allowedRole === 'Admin' && user.role === 'Visita');
    
    if (!hasAccess) {
        const target = (user.role === 'Admin' || user.role === 'Visita') ? '/admin' : '/teacher';
        return <Navigate to={target} replace />;
    }

    return <>{children}</>;
};

const AppRoutes = () => {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to={(user.role === 'Admin' || user.role === 'Visita') ? '/admin' : '/teacher'} /> : <Login />} />
            <Route path="/admin/*" element={
                <ProtectedRoute allowedRole="Admin">
                    <AdminDashboard />
                </ProtectedRoute>
            } />
            
            <Route path="/admin/grades" element={
                <ProtectedRoute allowedRole="Admin">
                    <GradesSheet />
                </ProtectedRoute>
            } />
            
            <Route path="/teacher" element={
                <ProtectedRoute allowedRole="Docente">
                    <TeacherDashboard />
                </ProtectedRoute>
            } />
            
            <Route path="/teacher/grades/:assignmentId" element={
                <ProtectedRoute allowedRole="Docente">
                    <TeacherGradesSheetWrapper />
                </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

function App() {
  return (
    <A11yProvider>
      <MigrationNotice targetUrl="https://ltp-v2.vercel.app/" initialSeconds={10} />
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </A11yProvider>
  );
}

export default App;
