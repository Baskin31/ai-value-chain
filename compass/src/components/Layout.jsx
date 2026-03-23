import React from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children, activeProfile, onProfileSwitch }) {
  return (
    <div className="flex h-screen overflow-hidden bg-parchment-100">
      <Sidebar activeProfile={activeProfile} onProfileSwitch={onProfileSwitch} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
