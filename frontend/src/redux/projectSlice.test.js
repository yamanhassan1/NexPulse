import test from 'node:test'
import assert from 'node:assert/strict'
import reducer, {
  addNewProject,
  clearProjects,
  setCurrentProject,
  setDeleteProject,
  setProjectName,
  setProjectStarred,
  setProjects,
  setStarredProjects,
} from './projectSlice.js'

const baseState = reducer(undefined, { type: '@@init' })

test('setCurrentProject records the project without faking a loaded list', () => {
  const state = reducer(baseState, setCurrentProject({ _id: 'p1', name: 'One' }))

  assert.equal(state.currentProject._id, 'p1')
  // Regression: this used to flip projectsLoaded, which made the dashboard
  // skip its fetch and render an empty grid after a hard reload.
  assert.equal(state.projectsLoaded, false)
  assert.equal(state.loadingProjects, false)
  assert.deepEqual(state.projects, [])
})

test('setCurrentProject(null) clears the stale project', () => {
  const withProject = reducer(baseState, setCurrentProject({ _id: 'p1', name: 'One' }))
  const cleared = reducer(withProject, setCurrentProject(null))

  assert.equal(cleared.currentProject, null)
})

test('setProjectName renames the project everywhere it appears', () => {
  let state = reducer(baseState, setProjects([{ _id: 'p1', name: 'Old', starred: true }]))
  state = reducer(state, setStarredProjects([{ _id: 'p1', name: 'Old', starred: true }]))
  state = reducer(state, setCurrentProject({ _id: 'p1', name: 'Old' }))

  const renamed = reducer(state, setProjectName({ id: 'p1', name: 'New' }))

  assert.equal(renamed.projects[0].name, 'New')
  assert.equal(renamed.starredProjects[0].name, 'New')
  assert.equal(renamed.currentProject.name, 'New')
})

test('setProjectName leaves other projects alone', () => {
  let state = reducer(baseState, setProjects([
    { _id: 'p1', name: 'One' },
    { _id: 'p2', name: 'Two' },
  ]))

  state = reducer(state, setProjectName({ id: 'p2', name: 'Renamed' }))

  assert.equal(state.projects[0].name, 'One')
  assert.equal(state.projects[1].name, 'Renamed')
})

test('starring adds to the starred list once, unstarring removes it', () => {
  let state = reducer(baseState, setProjects([{ _id: 'p1', name: 'One', starred: false }]))

  state = reducer(state, setProjectStarred({ id: 'p1', starred: true }))
  assert.equal(state.starredProjects.length, 1)

  state = reducer(state, setProjectStarred({ id: 'p1', starred: true }))
  assert.equal(state.starredProjects.length, 1, 'must not duplicate')

  state = reducer(state, setProjectStarred({ id: 'p1', starred: false }))
  assert.equal(state.starredProjects.length, 0)
})

test('deleting removes the project from both lists', () => {
  let state = reducer(baseState, setProjects([{ _id: 'p1', name: 'One' }]))
  state = reducer(state, setStarredProjects([{ _id: 'p1', name: 'One' }]))
  state = reducer(state, setDeleteProject('p1'))

  assert.deepEqual(state.projects, [])
  assert.deepEqual(state.starredProjects, [])
})

test('addNewProject puts the newest project first', () => {
  let state = reducer(baseState, addNewProject({ _id: 'a', name: 'A' }))
  state = reducer(state, addNewProject({ _id: 'b', name: 'B' }))

  assert.deepEqual(state.projects.map((project) => project._id), ['b', 'a'])
})

test('clearProjects resets to the initial state', () => {
  let state = reducer(baseState, setProjects([{ _id: 'p1', name: 'One' }]))
  state = reducer(state, setCurrentProject({ _id: 'p1', name: 'One' }))

  const cleared = reducer(state, clearProjects())

  assert.deepEqual(cleared.projects, [])
  assert.equal(cleared.currentProject, null)
  assert.equal(cleared.projectsLoaded, false)
})
