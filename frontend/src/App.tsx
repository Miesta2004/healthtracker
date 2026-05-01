import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PatientDetail from './pages/PatientDetail'


function App() {
    const isAuthenticated = !!localStorage.getItem('access_token')

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
                isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
            } />
            <Route path="/" element={
                isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
            } />
            <Route path="/patients/:id" element={
                isAuthenticated ? <PatientDetail /> : <Navigate to="/login" />
            } />
        </Routes>
    )
}

export default App