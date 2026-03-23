import React, { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getActiveProfile, setActiveProfile as setActiveProfileApi } from './lib/api'
import Layout from './components/Layout'
import Onboarding from './views/Onboarding'
import Today from './views/Today'
import BeliefsView from './views/BeliefsView'
import RolesView from './views/RolesView'
import Placeholder from './views/Placeholder'
import Settings from './views/Settings'

export default function App() {
  const [activeProfile, setActiveProfile] = useState(null) // null = loading
  const [ready, setReady] = useState(false)

  useEffect(() => {
    getActiveProfile().then((profile) => {
      setActiveProfile(profile)
      setReady(true)
    })
  }, [])

  const handleProfileSwitch = useCallback(async (profile) => {
    const updated = await setActiveProfileApi(profile.profile_id)
    setActiveProfile(updated)
  }, [])

  const handleOnboardingComplete = useCallback((profile) => {
    setActiveProfile(profile)
  }, [])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-parchment-100">
        <div className="text-text-tertiary text-sm">Loading...</div>
      </div>
    )
  }

  if (!activeProfile || !activeProfile.onboarding_complete) {
    return (
      <Onboarding onComplete={handleOnboardingComplete} />
    )
  }

  return (
    <Layout activeProfile={activeProfile} onProfileSwitch={handleProfileSwitch}>
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
              description="Patterns surface over time. Lodestar will notice principle violations, role neglect, and moments of why drift — and bring them to you thoughtfully."
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
