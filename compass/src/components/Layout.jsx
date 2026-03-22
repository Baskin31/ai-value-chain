import React from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-parchment-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
