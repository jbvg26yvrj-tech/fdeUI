import { Suspense, lazy } from 'react';
import { Route, Routes, Navigate, Link } from 'react-router';
import { Toaster } from 'sonner';

const PipelinesPage = lazy(() => import('../pages/pipelines-page'));
const PipelineDetailsPage = lazy(() => import('../pages/pipelines-details-page'));
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegistrationPage = lazy(() => import('../features/auth/pages/RegistrationPage'));
const ChangePasswordPage = lazy(() => import('../features/auth/pages/ChangePasswordPage'));
const SessionsPage = lazy(() => import('../pages/sessions-page'));
const SessionDetailsPage = lazy(() => import('../pages/session-details'));
const PermissionsPage = lazy(() => import('../pages/permissions-page/PermissionsPage'));
const ChangeDatacenterPage = lazy(() => import('../pages/change-datacenter-page'));

import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Layout } from '../shared/ui/layout/Layout';
import { useAuthInitialization } from '../shared/hooks/useAuthInitialization';
import { AccessRoute } from '../shared/components/AccessRoute';
const AboutPage = lazy(() => import('../pages/about-page'));
const AnalyticsPage = lazy(() => import('../pages/analytics-page/AnalyticsPage'));
const LogsPage = lazy(() => import('../pages/logs-page/LogsPage'));
const LokiSettingsPage = lazy(() => import('../pages/settings-page/LokiSettingsPage'));
const LdapSettingsPage = lazy(() => import('../pages/settings-page/LdapSettingsPage'));

const PageLoader = () => (
  <div className='flex justify-center items-center p-12'>
    <div className='text-lg text-gray-600 dark:text-gray-400'>Загрузка...</div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }

  if (
    user?.authSource !== 'LDAP' &&
    (user?.passwordChangeRequired || sessionStorage.getItem('requiresPasswordChange') === 'true') &&
    window.location.pathname !== '/change-password'
  ) {
    return <Navigate to='/change-password' replace />;
  }

  return <AccessRoute>{children}</AccessRoute>;
};

const PasswordChangeRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className='flex justify-center items-center p-12'>
        <div className='text-lg text-gray-600 dark:text-gray-400'>Проверка авторизации...</div>
      </div>
    );
  }

  return isAuthenticated ? (
    user?.authSource === 'LDAP' ? (
      <Navigate to='/about' replace />
    ) : (
      <>{children}</>
    )
  ) : (
    <Navigate to='/login' replace />
  );
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className='flex justify-center items-center p-12'>
        <div className='text-lg text-gray-600 dark:text-gray-400'>Проверка авторизации...</div>
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to='/' replace />;
};

function LandingRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to='/login' replace />;
  if (
    user?.authSource !== 'LDAP' &&
    (user?.passwordChangeRequired || sessionStorage.getItem('requiresPasswordChange') === 'true')
  )
    return <Navigate to='/change-password' replace />;
  return <AccessRoute landing />;
}

function AppContent() {
  useAuthInitialization();

  return (
    <Layout>
      <Routes>
        {/* Публичные маршруты */}
        <Route
          path='/login'
          element={
            <PublicRoute>
              <Suspense fallback={<PageLoader />}>
                <LoginPage />
              </Suspense>
            </PublicRoute>
          }
        />
        <Route
          path='/registration'
          element={
            <PublicRoute>
              <Suspense fallback={<PageLoader />}>
                <RegistrationPage />
              </Suspense>
            </PublicRoute>
          }
        />

        {/* Защищенные маршруты */}
        <Route
          path='/pipelines'
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <PipelinesPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path='/pipelines/:id'
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <PipelineDetailsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path='/sessions'
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <SessionsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path='/sessions/:id'
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <SessionDetailsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path='/change-password'
          element={
            <PasswordChangeRoute>
              <Suspense fallback={<PageLoader />}>
                <ChangePasswordPage />
              </Suspense>
            </PasswordChangeRoute>
          }
        />
        <Route
          path='/change-datacenter'
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <ChangeDatacenterPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path='/permissions'
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <PermissionsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route
          path='/about'
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <AboutPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path='/settings/ldap'
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <LdapSettingsPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path='/analytics' element={<ProtectedRoute><Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense></ProtectedRoute>} />
        <Route path='/analytics/pipelines/:id' element={<ProtectedRoute><Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense></ProtectedRoute>} />
        <Route path='/logs' element={<ProtectedRoute><Suspense fallback={<PageLoader />}><LogsPage /></Suspense></ProtectedRoute>} />
        <Route path='/settings/loki' element={<ProtectedRoute><Suspense fallback={<PageLoader />}><LokiSettingsPage /></Suspense></ProtectedRoute>} />
        <Route path='/' element={<LandingRoute />} />
        <Route
          path='*'
          element={
            <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
              <div className='text-center'>
                <h1 className='text-4xl font-bold text-gray-900 dark:text-white mb-4'>404</h1>
                <p className='text-xl text-gray-600 dark:text-gray-300 mb-8'>Страница не найдена</p>
                <Link
                  to='/pipelines'
                  className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors'
                >
                  На главную
                </Link>
              </div>
            </div>
          }
        />
      </Routes>
      <Toaster
        position='bottom-left'
        theme='light'
        toastOptions={{
          classNames: {
            toast: 'bg-opacity-90',
            success:
              '!bg-green-50 !text-green-900 !border !border-green-200 dark:!bg-green-900 dark:!text-green-100',
            error:
              '!bg-red-50 !text-red-900 !border !border-red-200 dark:!bg-red-900 dark:!text-red-100',
            warning:
              '!bg-yellow-50 !text-yellow-900 !border !border-yellow-200 dark:!bg-yellow-900 dark:!text-yellow-100',
            info: '!bg-blue-50 !text-blue-900 !border !border-blue-200 dark:!bg-blue-900 dark:!text-blue-100',
          },
        }}
      />
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
