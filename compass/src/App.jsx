import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getAppState } from './lib/api'
import Layout from './components/Layout'
import Onboarding from './views/Onboarding'
import Today from './views/Today'
import BeliefsView from './views/BeliefsView'
import RolesView from './views/RolesView'
import Placeholder from './views/Placeholder'
import Settings from './views/Settings'

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(null) // null = loading

  useEffect(() => {
    getAppState('onboarding_complete').then((val) => {
      setOnboardingComplete(val === 'true')
    })
  }, [])

  if (onboardingComplete === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-parchment-100">
        <div className="text-text-tertiary text-sm">Loading...</div>
      </div>
    )
  }

  if (!onboardingComplete) {
    return (
      <Onboarding
        onComplete={() => setOnboardingComplete(true)}
      />
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<Today />} />
        <Route
          path="/compass"
          element={
            <Placeholder
              title="Weekly Compass"
              description="Each week, align your roles, goals, and intentions before the week begins. Review what happened and what shifted."
              comingSoon
            />
          }
        />
        <Route
          path="/goals"
          element={
            <Placeholder
              title="Goals"
              description="Long, mid, and short horizons — each goal tethered to a role and rooted in your why."
              comingSoon
            />
          }
        />
        <Route path="/roles" element={<RolesView />} />
        <Route path="/beliefs" element={<BeliefsView />} />
        <Route
          path="/insights"
          element={
            <Placeholder
              title="Insights"
              description="Patterns surface over time. Compass will notice principle violations, role neglect, and moments of why drift — and bring them to you thoughtfully."
              comingSoon
            />
          }
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </Layout>
  )
}
