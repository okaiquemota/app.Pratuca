import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Outlet, ScrollRestoration } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { MarketingLayout } from '@/components/layout/MarketingLayout'
import { Spinner } from '@/components/ui/Feedback'
import { RedirectIfAuthenticated, RequireAuth } from '@/features/auth/guards'
import { RequireStore } from '@/features/stores/RequireStore'
import { RouteError } from './RouteError'

function page(load: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(load)
  return (
    <Suspense fallback={<Spinner className="min-h-[50vh]" />}>
      <Component />
    </Suspense>
  )
}

function Root({ children }: { children?: ReactNode }) {
  return (
    <>
      <ScrollRestoration />
      {children ?? <Outlet />}
    </>
  )
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      {
        element: <MarketingLayout />,
        children: [
          { index: true, element: page(() => import('@/features/marketing/pages/LandingPage')) },
          { path: 'precos', element: page(() => import('@/features/marketing/pages/PricingPage')) },
          { path: 'termos', element: page(() => import('@/features/marketing/pages/TermsPage')) },
          { path: 'privacidade', element: page(() => import('@/features/marketing/pages/PrivacyPage')) },
          { path: 'ajuda', element: page(() => import('@/features/marketing/pages/HelpPage')) },
        ],
      },
      {
        path: 'entrar',
        element: <RedirectIfAuthenticated>{page(() => import('@/features/auth/pages/LoginPage'))}</RedirectIfAuthenticated>,
      },
      {
        path: 'criar-conta',
        element: <RedirectIfAuthenticated>{page(() => import('@/features/auth/pages/SignupPage'))}</RedirectIfAuthenticated>,
      },
      { path: 'recuperar-senha', element: page(() => import('@/features/auth/pages/ForgotPasswordPage')) },
      { path: 'redefinir-senha', element: page(() => import('@/features/auth/pages/ResetPasswordPage')) },
      {
        path: 'app/comecar',
        element: <RequireAuth>{page(() => import('@/features/onboarding/OnboardingPage'))}</RequireAuth>,
      },
      {
        path: 'app',
        element: (
          <RequireAuth>
            <RequireStore>
              <AppLayout />
            </RequireStore>
          </RequireAuth>
        ),
        children: [
          { index: true, element: page(() => import('@/features/dashboard/DashboardPage')) },
          { path: 'pedidos', element: page(() => import('@/features/orders/pages/OrdersPage')) },
          { path: 'cardapio', element: page(() => import('@/features/catalog/pages/MenuPage')) },
          { path: 'categorias', element: page(() => import('@/features/catalog/pages/CategoriesPage')) },
          { path: 'clientes', element: page(() => import('@/features/customers/CustomersPage')) },
          { path: 'configuracoes', element: page(() => import('@/features/stores/pages/SettingsPage')) },
          { path: 'assinatura', element: page(() => import('@/features/billing/SubscriptionPage')) },
        ],
      },
      { path: 'loja/:slug', element: page(() => import('@/features/public-menu/pages/PublicStorePage')) },
      { path: '*', element: page(() => import('@/features/marketing/pages/NotFoundPage')) },
    ],
  },
])
