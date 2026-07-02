import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard } from 'lemma-sdk/react'
import { lemmaClient } from './lemma-client'
import { App } from './App'
import { Landing } from './Landing'
import './styles.css'

const queryClient = new QueryClient()

function Root() {
  const [entered, setEntered] = useState(false)

  if (!entered) return <Landing onEnter={() => setEntered(true)} />

  return (
    <AuthGuard
      client={lemmaClient}
      loadingFallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e6e6e0', borderTopColor: '#5b5bf0', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#6b6b63', fontSize: 14 }}>Loading SupportPilot...</p>
          </div>
        </div>
      }
    >
      <App />
    </AuthGuard>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </React.StrictMode>,
)
