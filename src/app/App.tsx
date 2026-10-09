import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RouterProvider } from 'react-router'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { createQueryClient } from '@/lib/queryClient'
import { router } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
