import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import ConsultationDetail from './pages/ConsultationDetail'
import DocumentEditeur from './pages/DocumentEditeur'
import Employes from './pages/Employes'
import AddEmploye from './pages/AddEmploye'
import Services from './pages/Services'
import ServiceDetail from './pages/ServiceDetail'
import Analytics from './pages/Analytics'
import AddSignesVitaux from './pages/AddSignesVitaux'
import AddHospitalisation from './pages/AddHospitalisation'
import Urgences from './pages/Urgences'
import AccesRefuse from './pages/AccesRefuse'
import EmployeDetail from './pages/EmployeDetail'
import RendezVousPage from './pages/RendezVous'
import CalendrierPage from './pages/Calendrier'
import Laboratoire from './pages/Laboratoire'
import Settings from './pages/Settings'
import DemandesConges from './pages/DemandesConges'
import SuperPresentation from './pages/SuperPresentation'
import Admissions from './pages/Admissions'
import NouvelleAdmission from './pages/NouvelleAdmission'
import FileAttenteService from './pages/FileAttenteService'
import RechercheAdmission from './pages/RechercheAdmission'
import BraceletsAdmission from './pages/BraceletsAdmission'
import ControleAccompagnants from './pages/ControleAccompagnants'
import Activites from './pages/Activites'
import Facturation from './pages/Facturation'
import FactureDetail from './pages/FactureDetail'
import Caisse from './pages/Caisse'
import GrilleTarifaire from './pages/GrilleTarifaire'
import Assurance from './pages/Assurance'
import BordereauDetail from './pages/BordereauDetail'

/**
 * Remplace un simple <Navigate to="/dashboard" /> pour "/" et le catch-all :
 * l'agent d'admission n'a pas de lien "Dashboard" dans sa sidebar dédiée
 * (voir Sidebar.tsx), donc l'y renvoyer par défaut serait une impasse de
 * navigation. Les autres rôles gardent le comportement d'origine.
 */
function DefaultRedirect() {
    const { user, hasRole } = useAuth()
    if (user && hasRole('agent_admission') && !hasRole('admin')) {
        return <Navigate to="/admissions/recherche" replace />
    }
    return <Navigate to="/dashboard" replace />
}


function App() {
    return (
        <AuthProvider>
            <Routes>
                {/* ── Publique ── */}
                <Route path="/login" element={<Login />} />
                <Route path="/acces-refuse" element={<AccesRefuse />} />
                <Route path="/" element={<DefaultRedirect />} />
                <Route path="/presentation" element={<SuperPresentation />} />

                {/* ── Tous les employés connectés ── */}
                <Route path="/dashboard" element={
                    <ProtectedRoute><Dashboard /></ProtectedRoute>
                } />
                <Route path="/activites" element={
                    <ProtectedRoute><Activites /></ProtectedRoute>
                } />
                <Route path="/patients" element={
                    <ProtectedRoute roles={['admin', 'medecin', 'infirmier', 'secretaire']}>
                        <Patients />
                    </ProtectedRoute>
                } />
                <Route path="/patients/:id" element={
                    <ProtectedRoute><PatientDetail /></ProtectedRoute>
                } />
                <Route path="/patients/:id/consultations/new" element={
                    <ProtectedRoute><ConsultationDetail /></ProtectedRoute>
                } />
                <Route path="/patients/:id/consultations/:consultId" element={
                    <ProtectedRoute><ConsultationDetail /></ProtectedRoute>
                } />
                <Route path="/patients/:id/documents/:documentId" element={
                    <ProtectedRoute><DocumentEditeur /></ProtectedRoute>
                } />
                <Route path="/patients/:id/signes_vitaux/newSignes" element={
                    <ProtectedRoute roles={['admin', 'medecin', 'infirmier']}>
                        <AddSignesVitaux />
                    </ProtectedRoute>
                } />
                <Route path="/settings" element={
                    <ProtectedRoute><Settings /></ProtectedRoute>
                } />
                <Route path="/patients/:id/hospitalisations/new" element={
                    <ProtectedRoute roles={['admin', 'medecin']}>
                        <AddHospitalisation />
                    </ProtectedRoute>
                } />

                {/* ── Médecin, infirmier, admin ── */}
                <Route path="/urgences" element={
                    <ProtectedRoute roles={['admin', 'medecin', 'infirmier']}>
                        <Urgences />
                    </ProtectedRoute>
                } />

                {/* ── Admin, laborantin ── */}
                <Route path="/laboratoire" element={
                    <ProtectedRoute roles={['admin', 'laborantin']}>
                        <Laboratoire />
                    </ProtectedRoute>
                } />

                {/* ── Service des Admissions ── */}
                <Route path="/admissions" element={
                    <ProtectedRoute roles={['admin', 'agent_admission']}>
                        <Admissions />
                    </ProtectedRoute>
                } />
                <Route path="/admissions/nouvelle" element={
                    <ProtectedRoute roles={['admin', 'agent_admission']}>
                        <NouvelleAdmission />
                    </ProtectedRoute>
                } />
                <Route path="/admissions/recherche" element={
                    <ProtectedRoute roles={['admin', 'agent_admission']}>
                        <RechercheAdmission />
                    </ProtectedRoute>
                } />
                <Route path="/admissions/bracelets" element={
                    <ProtectedRoute roles={['admin', 'agent_admission']}>
                        <BraceletsAdmission />
                    </ProtectedRoute>
                } />
                <Route path="/admissions/accompagnants" element={
                    <ProtectedRoute roles={['admin', 'agent_admission']}>
                        <ControleAccompagnants />
                    </ProtectedRoute>
                } />

                {/* ── Secrétariat de service : file d'attente des patients orientés ── */}
                <Route path="/file-attente" element={
                    <ProtectedRoute roles={['admin', 'secretaire']}>
                        <FileAttenteService />
                    </ProtectedRoute>
                } />

                {/* ── Admin, médecin, secrétaire ── */}
                <Route path="/rendez_vous" element={
                    <ProtectedRoute roles={['admin', 'medecin', 'infirmier', 'secretaire']}>
                        <RendezVousPage />
                    </ProtectedRoute>
                } />
                <Route path="/calendrier" element={
                    <ProtectedRoute roles={['admin', 'medecin', 'infirmier', 'secretaire']}>
                        <CalendrierPage />
                    </ProtectedRoute>
                } />

                {/* ── Admin seulement ── */}
                <Route path="/employes" element={
                    <ProtectedRoute roles={['admin']}>
                        <Employes />
                    </ProtectedRoute>
                } />
                <Route path="/employes/newEmploye" element={
                    <ProtectedRoute roles={['admin']}>
                        <AddEmploye />
                    </ProtectedRoute>
                } />
                <Route path="/employes/:id" element={
                    <ProtectedRoute roles={['admin']}>
                        <EmployeDetail />
                    </ProtectedRoute>
                } />
                <Route path="/services" element={
                    <ProtectedRoute roles={['admin']}>
                        <Services />
                    </ProtectedRoute>
                } />
                <Route path="/services/:id" element={
                    <ProtectedRoute roles={['admin']}>
                        <ServiceDetail />
                    </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                    <ProtectedRoute roles={['admin']}>
                        <Analytics />
                    </ProtectedRoute>
                } />
                <Route path="/conges" element={
                    <ProtectedRoute roles={['admin']}>
                        <DemandesConges />
                    </ProtectedRoute>
                } />

                {/* ── Facturation & Encaissement ── */}
                <Route path="/facturation" element={
                    <ProtectedRoute roles={['admin', 'facturier']}>
                        <Facturation />
                    </ProtectedRoute>
                } />
                <Route path="/facturation/:id" element={
                    <ProtectedRoute roles={['admin', 'facturier', 'caissier']}>
                        <FactureDetail />
                    </ProtectedRoute>
                } />
                <Route path="/caisse" element={
                    <ProtectedRoute roles={['admin', 'caissier']}>
                        <Caisse />
                    </ProtectedRoute>
                } />
                <Route path="/grille-tarifaire" element={
                    <ProtectedRoute roles={['admin']}>
                        <GrilleTarifaire />
                    </ProtectedRoute>
                } />
                <Route path="/assurance" element={
                    <ProtectedRoute roles={['admin', 'facturier']}>
                        <Assurance />
                    </ProtectedRoute>
                } />
                <Route path="/assurance/:id" element={
                    <ProtectedRoute roles={['admin', 'facturier']}>
                        <BordereauDetail />
                    </ProtectedRoute>
                } />

                {/* ── Fallback ── */}
                <Route path="*" element={<DefaultRedirect />} />
            </Routes>
        </AuthProvider>
    )
}

export default App