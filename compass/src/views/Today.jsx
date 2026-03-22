import React, { useState, useEffect, useCallback } from 'react'
import { getTasksForDate, createTask, updateTask, deleteTask, getRoles } from '../lib/api'

function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const ENERGY_COLORS = {
  low: 'bg-green-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
}

const ENERGY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' }

function EnergyDot({ level }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${ENERGY_COLORS[level] || 'bg-gray-300'} flex-shrink-0`}
      title={ENERGY_LABELS[level]}
    />
  )
}

function TaskCard({ task, onDone, onSkip, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const isDone = task.status === 'done'
  const isSkipped = task.status === 'skipped'
  const dimmed = isDone || isSkipped

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-150 group
        ${dimmed ? 'opacity-50 bg-parchment-100 border-border-light' : 'bg-surface border-border hover:border-sage-100'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => !isDone && onDone(task)}
        className={`flex-shrink-0 w-5 h-5 rounded border transition-all duration-100 flex items-center justify-center
          ${isDone
            ? 'bg-sage-500 border-sage-500'
            : 'border-border hover:border-sage-400'
          }`}
      >
        {isDone && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span className={`flex-1 text-sm ${isDone ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
        {task.title}
        {isSkipped && <span className="ml-2 text-xs text-text-tertiary">(skipped)</span>}
      </span>

      {/* Energy dot */}
      <EnergyDot level={task.energy_required} />

      {/* Role badge */}
      {task.role_name && (
        <span
          className="text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0"
          style={{
            borderColor: task.role_color || '#E2DAD0',
            color: task.role_color || '#6B6157',
            backgroundColor: task.role_color ? `${task.role_color}18` : '#F5F0E8',
          }}
        >
          {task.role_name}
        </span>
      )}

      {/* Hover actions */}
      {hovered && !dimmed && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onSkip(task)}
            className="text-xs text-text-tertiary hover:text-warning px-2 py-0.5 rounded transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.task_id)}
            className="text-text-tertiary hover:text-warning transition-colors p-0.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function SkipModal({ task, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-surface rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-lg text-text-primary mb-1">What got in the way?</h3>
        <p className="text-sm text-text-tertiary mb-4">
          "{task.title}"
        </p>
        <textarea
          className="textarea-base mb-4"
          rows={3}
          placeholder="Briefly note what happened..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            className="btn-primary"
          >
            Skip task
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Today() {
  const [tasks, setTasks] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date()
  const todayStr = toISODate(today)

  // Add-task form state
  const [newTitle, setNewTitle] = useState('')
  const [newRoleId, setNewRoleId] = useState('')
  const [newEnergy, setNewEnergy] = useState('medium')
  const [adding, setAdding] = useState(false)

  // Skip modal
  const [skipTarget, setSkipTarget] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [t, r] = await Promise.all([
        getTasksForDate(todayStr),
        getRoles(),
      ])
      setTasks(t)
      setRoles(r)
    } finally {
      setLoading(false)
    }
  }, [todayStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAddTask(e) {
    e && e.preventDefault()
    if (!newTitle.trim() || adding) return
    setAdding(true)
    try {
      const task = await createTask({
        title: newTitle.trim(),
        role_id: newRoleId ? Number(newRoleId) : null,
        energy_required: newEnergy,
        scheduled_at: `${todayStr}T00:00:00`,
        status: 'pending',
      })
      setTasks((prev) => [...prev, task])
      setNewTitle('')
      setNewRoleId('')
      setNewEnergy('medium')
    } finally {
      setAdding(false)
    }
  }

  async function handleDone(task) {
    const updated = await updateTask(task.task_id, { status: 'done' })
    setTasks((prev) => prev.map((t) => (t.task_id === task.task_id ? updated : t)))
  }

  async function handleDelete(taskId) {
    await deleteTask(taskId)
    setTasks((prev) => prev.filter((t) => t.task_id !== taskId))
  }

  async function handleSkipConfirm(reason) {
    if (!skipTarget) return
    const updated = await updateTask(skipTarget.task_id, {
      status: 'skipped',
      skipped_reason: reason || null,
    })
    setTasks((prev) => prev.map((t) => (t.task_id === skipTarget.task_id ? updated : t)))
    setSkipTarget(null)
  }

  // Group tasks by role
  const grouped = {}
  tasks.forEach((t) => {
    const key = t.role_id ? `role_${t.role_id}` : 'general'
    if (!grouped[key]) {
      grouped[key] = {
        label: t.role_name || 'General',
        color: t.role_color || '#9A918A',
        tasks: [],
      }
    }
    grouped[key].tasks.push(t)
  })

  const doneCount = tasks.filter((t) => t.status === 'done').length
  const totalMins = tasks.reduce((sum, t) => sum + (t.duration_mins || 0), 0)
  const donePct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-text-primary mb-1">Today</h1>
        <p className="text-text-secondary text-sm">{formatDate(today)}</p>
        {tasks.length > 0 && (
          <p className="text-text-tertiary text-xs mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {doneCount} done
          </p>
        )}
      </div>

      {/* Quick-add bar */}
      <form onSubmit={handleAddTask} className="mb-8">
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <input
            type="text"
            className="w-full bg-transparent text-text-primary placeholder-text-tertiary text-sm focus:outline-none mb-3"
            placeholder="What needs doing today?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div className="flex items-center gap-3 flex-wrap">
            {/* Role selector */}
            {roles.length > 0 && (
              <select
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
                className="text-xs border border-border rounded-md px-2.5 py-1.5 bg-parchment-100 text-text-secondary focus:outline-none focus:ring-1 focus:ring-sage-500"
              >
                <option value="">No role</option>
                {roles.map((r) => (
                  <option key={r.role_id} value={r.role_id}>{r.name}</option>
                ))}
              </select>
            )}

            {/* Energy pills */}
            <div className="flex items-center gap-1.5">
              {['low', 'medium', 'high'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setNewEnergy(level)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors duration-100 capitalize ${
                    newEnergy === level
                      ? 'border-sage-500 bg-sage-50 text-sage-600 font-medium'
                      : 'border-border text-text-tertiary hover:border-sage-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <button
              type="submit"
              disabled={!newTitle.trim() || adding}
              className="btn-primary py-1.5 text-xs"
            >
              Add
            </button>
          </div>
        </div>
      </form>

      {/* Task list */}
      {loading ? (
        <div className="text-text-tertiary text-sm text-center py-12">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-tertiary text-sm">
            No tasks for today. What do you want to move forward?
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([key, group]) => (
            <div key={key}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: group.color }} />
                <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                  {group.label}
                </span>
              </div>
              <div className="space-y-2">
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.task_id}
                    task={task}
                    onDone={handleDone}
                    onSkip={setSkipTarget}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {tasks.length > 0 && (
        <div className="mt-10 pt-5 border-t border-border-light flex items-center justify-between text-xs text-text-tertiary">
          <span>
            {doneCount} of {tasks.length} done · {donePct}%
          </span>
          {totalMins > 0 && (
            <span>{totalMins} min estimated</span>
          )}
        </div>
      )}

      {/* Skip modal */}
      {skipTarget && (
        <SkipModal
          task={skipTarget}
          onConfirm={handleSkipConfirm}
          onCancel={() => setSkipTarget(null)}
        />
      )}
    </div>
  )
}
