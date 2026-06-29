import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PatientDetail from './pages/PatientDetail'
import AddPatient from './pages/AddPatient'
import ConsultationDetail from './pages/ConsultationDetail'
import Employes from './pages/Employes'
import AddEmploye from './pages/AddEmploye'


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
            <Route path="/patients/newPatient" element={
                isAuthenticated ? <AddPatient /> : <Navigate to="/login" />
            } />
            <Route path="/patients/:id/consultations/new" element={
                isAuthenticated ? <ConsultationDetail /> : <Navigate to="/login" />
            } />
            <Route path="/patients/:id/consultations/:consultId" element={
                isAuthenticated ? <ConsultationDetail /> : <Navigate to="/login" />
            } />
            <Route path="/employes" element={
                isAuthenticated ? <Employes /> : <Navigate to="/login" />
            } />
            <Route path="/employes/newEmploye" element={
                isAuthenticated ? <AddEmploye /> : <Navigate to="/login" />
            } />
        </Routes>
    )
}

export default App