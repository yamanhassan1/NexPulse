import test from "node:test"
import assert from "node:assert/strict"
import {
  SHORTCUTS,
  bindingToCombo,
  comboFromEvent,
  findShortcut,
  formatBinding,
  isEditableTarget,
  matchesBinding,
  normalizeKey,
  shortcutLabel,
} from "./shortcuts.js"

test("normalizes platform modifiers into one canonical combo", () => {
  assert.equal(bindingToCombo("Mod+Shift+P", "windows"), "Ctrl+Shift+p")
  assert.equal(bindingToCombo("Mod+Shift+P", "mac"), "Meta+Shift+p")
  assert.equal(bindingToCombo("Shift+Alt+F", "linux"), "Alt+Shift+f")
})

test("matches events regardless of modifier order", () => {
  const event = { ctrlKey: true, metaKey: false, altKey: true, shiftKey: true, key: "F" }
  const altShift = { ctrlKey: false, metaKey: false, altKey: true, shiftKey: true, key: "F" }

  assert.equal(matchesBinding(altShift, "Alt+Shift+F", "windows"), true)
  assert.equal(matchesBinding(event, "Mod+Alt+Shift+F", "windows"), true)
  assert.equal(matchesBinding(event, "Mod+Shift+F", "windows"), false)
})

test("normalizes named and printable keys", () => {
  assert.equal(normalizeKey(" "), "Space")
  assert.equal(normalizeKey("Esc"), "Escape")
  assert.equal(normalizeKey("ArrowUp"), "ArrowUp")
  assert.equal(normalizeKey("P"), "p")
  assert.equal(comboFromEvent({ ctrlKey: true, key: " " }), "Ctrl+Space")
})

test("formats shortcuts for each platform", () => {
  assert.equal(formatBinding("Mod+Shift+P", "windows"), "Ctrl+Shift+P")
  assert.equal(formatBinding("Mod+Shift+P", "mac"), "⌘⇧P")
  assert.equal(formatBinding("Mod+K Mod+W", "windows"), "Ctrl+K, Ctrl+W")
})

test("every advertised shortcut has one unique id and binding", () => {
  const ids = SHORTCUTS.map((shortcut) => shortcut.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(SHORTCUTS.every((shortcut) => shortcut.label && shortcut.binding && shortcut.category))
  assert.equal(findShortcut("save").label, "Save file")
  assert.equal(shortcutLabel("save", "windows"), "Ctrl+S")
})

test("detects editable targets without swallowing buttons", () => {
  class FakeElement {
    constructor(tagName, type = "text", editable = false) {
      this.tagName = tagName
      this.type = type
      this.isContentEditable = editable
    }
    getAttribute(name) {
      return name === "type" ? this.type : null
    }
  }
  const original = globalThis.HTMLElement
  globalThis.HTMLElement = FakeElement
  try {
    assert.equal(isEditableTarget(new FakeElement("TEXTAREA")), true)
    assert.equal(isEditableTarget(new FakeElement("INPUT", "text")), true)
    assert.equal(isEditableTarget(new FakeElement("INPUT", "checkbox")), false)
    assert.equal(isEditableTarget(new FakeElement("BUTTON")), false)
    assert.equal(isEditableTarget(new FakeElement("DIV", "text", true)), true)
  } finally {
    globalThis.HTMLElement = original
  }
})
