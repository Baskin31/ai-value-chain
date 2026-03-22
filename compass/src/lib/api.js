// Re-export window.api as named exports for use in React components.
// window.api is injected by the Electron preload script via contextBridge.

export const getAppState = (key) => window.api.getAppState(key)
export const setAppState = (key, value) => window.api.setAppState(key, value)

export const getSetting = (key) => window.api.getSetting(key)
export const setSetting = (key, value) => window.api.setSetting(key, value)

export const suggestDomains = (statement) => window.api.suggestDomains(statement)

export const getBeliefs = () => window.api.getBeliefs()
export const createBelief = (data) => window.api.createBelief(data)
export const updateBelief = (id, data) => window.api.updateBelief(id, data)
export const deleteBelief = (id) => window.api.deleteBelief(id)

export const getWhy = () => window.api.getWhy()
export const setWhy = (data) => window.api.setWhy(data)

export const getPrinciples = () => window.api.getPrinciples()
export const createPrinciple = (data) => window.api.createPrinciple(data)
export const updatePrinciple = (id, data) => window.api.updatePrinciple(id, data)
export const deletePrinciple = (id) => window.api.deletePrinciple(id)

export const getRoles = () => window.api.getRoles()
export const createRole = (data) => window.api.createRole(data)
export const updateRole = (id, data) => window.api.updateRole(id, data)
export const deleteRole = (id) => window.api.deleteRole(id)

export const getTasksForDate = (date) => window.api.getTasksForDate(date)
export const createTask = (data) => window.api.createTask(data)
export const updateTask = (id, data) => window.api.updateTask(id, data)
export const deleteTask = (id) => window.api.deleteTask(id)
