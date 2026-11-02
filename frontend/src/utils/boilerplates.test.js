import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  buildTemplateFiles,
  deriveNames,
  findTemplate,
  normaliseTemplateName,
} from './boilerplates.js'

test('every template has a unique id, category and files', () => {
  const ids = TEMPLATES.map((template) => template.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.deepEqual(TEMPLATE_CATEGORIES, [
    'All',
    ...new Set(TEMPLATES.map((template) => template.category)),
  ])

  TEMPLATES.forEach((template) => {
    assert.ok(template.label)
    assert.ok(template.description)
    assert.ok(['file', 'starter'].includes(template.mode))
    assert.ok(template.files.length > 0)
    template.files.forEach((file) => {
      assert.equal(typeof file.path, 'string')
      assert.equal(typeof file.content, 'string')
    })
  })
})

test('findTemplate returns the matching template', () => {
  assert.equal(findTemplate('react-component').label, 'React component')
  assert.equal(findTemplate('missing'), null)
})

test('deriveNames handles Pascal, camel, kebab and hook names', () => {
  assert.deepEqual(deriveNames('user-profile.jsx'), {
    name: 'user-profile.jsx',
    base: 'user-profile',
    ext: 'jsx',
    stem: 'user-profile',
    Pascal: 'UserProfile',
    camel: 'userProfile',
    kebab: 'user-profile',
    hook: 'useUserProfile',
  })

  assert.equal(deriveNames('UseThing.js').hook, 'useThing')
  assert.equal(deriveNames('Button.test.js').stem, 'Button')
  assert.equal(deriveNames('docs/My Page.html').Pascal, 'MyPage')
  assert.equal(deriveNames('.gitignore').base, '.gitignore')
})

test('normaliseTemplateName adds the suggested extension to bare names', () => {
  const component = findTemplate('react-component')
  assert.equal(normaliseTemplateName(component, 'Button'), 'Button.jsx')
  assert.equal(normaliseTemplateName(component, 'Button.tsx'), 'Button.tsx')
  assert.equal(normaliseTemplateName(component, '  '), '')
  assert.equal(normaliseTemplateName(findTemplate('vite-react-starter'), 'my-app'), 'my-app')
})

test('buildTemplateFiles renders paths and placeholders', () => {
  const [file] = buildTemplateFiles(findTemplate('react-component'), 'user-card.jsx')

  assert.equal(file.path, 'user-card.jsx')
  assert.match(file.content, /function UserCard/)
  assert.match(file.content, /className=\{\["user-card"/)
})

test('a hook template derives its hook name from the file name', () => {
  const [file] = buildTemplateFiles(findTemplate('react-hook'), 'useToggle.js')

  assert.match(file.content, /export function useToggle/)
})

test('starter templates place every file inside the named folder', () => {
  const files = buildTemplateFiles(findTemplate('vite-react-starter'), 'My App')

  assert.equal(files.length, 6)
  files.forEach((file) => assert.ok(file.path.startsWith('my-app/')))

  const pkg = files.find((file) => file.path.endsWith('package.json'))
  assert.match(pkg.content, /"name": "my-app"/)

  const app = files.find((file) => file.path.endsWith('src/App.jsx'))
  assert.match(app.content, /<h1>MyApp<\/h1>/)
})

test('every template fully replaces its placeholders', () => {
  TEMPLATES.forEach((template) => {
    const files = buildTemplateFiles(template, template.suggestedName)
    files.forEach((file) => {
      assert.ok(!file.path.includes('{{'), `${template.id} has an unresolved path placeholder`)
      assert.ok(!file.content.includes('{{'), `${template.id} has an unresolved content placeholder`)
    })
  })
})

test('HTML page template creates the stylesheet and script it links to', () => {
  const files = buildTemplateFiles(findTemplate('html-page'), 'landing.html')

  assert.deepEqual(
    files.map((file) => file.path),
    ['landing.html', 'landing.css', 'landing.js'],
  )
  assert.match(files[0].content, /href="\.\/landing\.css"/)
  assert.match(files[0].content, /src="\.\/landing\.js"/)
})

test('README template uses the template description', () => {
  const [file] = buildTemplateFiles(findTemplate('readme'), 'README.md')

  assert.match(file.content, /^# Readme/)
  assert.match(file.content, /Project introduction/)
})
