const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // App State
  getAppState: (key) => ipcRenderer.invoke('app:getState', key),
  setAppState: (key, value) => ipcRenderer.invoke('app:setState', key, value),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // Beliefs
  getBeliefs: () => ipcRenderer.invoke('beliefs:getAll'),
  createBelief: (data) => ipcRenderer.invoke('beliefs:create', data),
  updateBelief: (id, data) => ipcRenderer.invoke('beliefs:update', id, data),
  deleteBelief: (id) => ipcRenderer.invoke('beliefs:delete', id),

  // Why
  getWhy: () => ipcRenderer.invoke('why:get'),
  setWhy: (data) => ipcRenderer.invoke('why:set', data),

  // Principles
  getPrinciples: () => ipcRenderer.invoke('principles:getAll'),
  createPrinciple: (data) => ipcRenderer.invoke('principles:create', data),
  updatePrinciple: (id, data) => ipcRenderer.invoke('principles:update', id, data),
  deletePrinciple: (id) => ipcRenderer.invoke('principles:delete', id),

  // Roles
  getRoles: () => ipcRenderer.invoke('roles:getAll'),
  createRole: (data) => ipcRenderer.invoke('roles:create', data),
  updateRole: (id, data) => ipcRenderer.invoke('roles:update', id, data),
  deleteRole: (id) => ipcRenderer.invoke('roles:delete', id),

  // Profiles
  getProfiles:         ()     => ipcRenderer.invoke('profiles:getAll'),
  createProfile:       (name) => ipcRenderer.invoke('profiles:create', name),
  setActiveProfile:    (id)   => ipcRenderer.invoke('profiles:setActive', id),
  markProfileComplete: (id)   => ipcRenderer.invoke('profiles:markComplete', id),
  getActiveProfile:    ()     => ipcRenderer.invoke('profiles:getActive'),

  // AI
  suggestDomains: (statement) => ipcRenderer.invoke('ai:suggestDomains', statement),

  // Tasks
  getTasksForDate: (date) => ipcRenderer.invoke('tasks:getForDate', date),
  createTask: (data) => ipcRenderer.invoke('tasks:create', data),
  updateTask: (id, data) => ipcRenderer.invoke('tasks:update', id, data),
  deleteTask: (id) => ipcRenderer.invoke('tasks:delete', id),
})
