import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Students from '@/pages/Students';
import Teachers from '@/pages/Teachers';
import Classes from '@/pages/Classes';
import Sections from '@/pages/Sections';
import Subjects from '@/pages/Subjects';
import Attendance from '@/pages/Attendance';
import Homework from '@/pages/Homework';
import Exams from '@/pages/Exams';
import Users from '@/pages/Users';
import Roles from '@/pages/Roles';
import SchoolSettings from '@/pages/SchoolSettings';
import PlatformDashboard from '@/pages/platform/PlatformDashboard';
import Schools from '@/pages/platform/Schools';
import Plans from '@/pages/platform/Plans';
import NotFound from '@/pages/NotFound';

/**
 * Super admin bina school chune "/" par aaye to platform console dikhana chahiye,
 * school dashboard nahi (uske paas dashboard.view to hai par tenant nahi).
 */
function HomeRoute() {
    const { isPlatform, school } = useAuth();
    if (isPlatform && !school) return <Navigate to="/platform" replace />;
    return <Dashboard />;
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<HomeRoute />} />

                            {/* Platform console */}
                            <Route
                                path="platform"
                                element={
                                    <ProtectedRoute platform permissions={['platform.dashboard.view']}>
                                        <PlatformDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="platform/schools"
                                element={
                                    <ProtectedRoute platform permissions={['platform.schools.view']}>
                                        <Schools />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="platform/plans"
                                element={
                                    <ProtectedRoute platform permissions={['platform.plans.manage']}>
                                        <Plans />
                                    </ProtectedRoute>
                                }
                            />

                            {/* School modules */}
                            <Route
                                path="students"
                                element={
                                    <ProtectedRoute permissions={['students.view']}>
                                        <Students />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="teachers"
                                element={
                                    <ProtectedRoute permissions={['teachers.view']}>
                                        <Teachers />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="classes"
                                element={
                                    <ProtectedRoute permissions={['classes.view']}>
                                        <Classes />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="sections"
                                element={
                                    <ProtectedRoute permissions={['sections.view']}>
                                        <Sections />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="subjects"
                                element={
                                    <ProtectedRoute permissions={['subjects.view']}>
                                        <Subjects />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="attendance"
                                element={
                                    <ProtectedRoute permissions={['attendance.view', 'attendance.mark']}>
                                        <Attendance />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="homework"
                                element={
                                    <ProtectedRoute permissions={['homework.view']}>
                                        <Homework />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="exams"
                                element={
                                    <ProtectedRoute permissions={['exams.view']}>
                                        <Exams />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="users"
                                element={
                                    <ProtectedRoute permissions={['users.view', 'users.manage']}>
                                        <Users />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="roles"
                                element={
                                    <ProtectedRoute permissions={['roles.view', 'roles.manage']}>
                                        <Roles />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="settings"
                                element={
                                    <ProtectedRoute permissions={['school.settings.view']}>
                                        <SchoolSettings />
                                    </ProtectedRoute>
                                }
                            />
                        </Route>

                        <Route path="/404" element={<NotFound />} />
                        <Route path="*" element={<Navigate to="/404" replace />} />
                    </Routes>

                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: 'var(--popover)',
                                color: 'var(--popover-foreground)',
                                border: '1px solid var(--border)',
                            },
                        }}
                    />
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}
