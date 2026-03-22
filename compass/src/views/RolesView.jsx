import React, { useState, useEffect } from 'react'
import { getRoles } from '../lib/api'
import { useNavigate } from 'react-router-dom'

function SatisfactionDots({ value, max = 10 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          className={`w-2.5 h-2.5 rounded-full ${
            n <= value ? 'bg-sage-500' : 'border border-border bg-transparent'
          }`}
        />
      ))}
    </div>
  )
}

function RoleCard({ role }) {
  return (
    <div
      className="bg-surface border border-border rounded-xl overflow-hidden transition-shadow duration-150 hover:shadow-sm"
      style={{ borderLeftColor: role.color, borderLeftWidth: '3px' }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-medium text-text-primary text-base">{role.name}</h3>
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: role.color }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Weekly intention</span>
            <span className="text-text-secondary font-medium">
              {role.time_budget_hrs_week} hrs
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-text-tertiary">Satisfaction</span>
              <span className="text-text-secondary">{role.current_satisfaction}/10</span>
            </div>
            <SatisfactionDots value={role.current_satisfaction} />
          </div>

          <div className="pt-2 border-t border-border-light flex items-center justify-between text-xs text-text-tertiary">
            <span>0 active goals</span>
            <span>0 tasks this week</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RolesView() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getRoles().then((r) => {
      setRoles(r)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-tertiary text-sm">
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-text-primary mb-1">Your Roles</h1>
        <p className="text-text-secondary text-sm">
          The domains where someone needs your presence.
        </p>
      </div>

      {roles.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {roles.map((role) => (
            <RoleCard key={role.role_id} role={role} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-text-tertiary text-sm mb-4">
            No roles added yet. Define your life roles to get started.
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="btn-primary"
          >
            Go to Settings
          </button>
        </div>
      )}
    </div>
  )
}
