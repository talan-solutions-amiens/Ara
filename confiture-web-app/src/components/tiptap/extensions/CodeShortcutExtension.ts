import { Extension } from "@tiptap/core";

// ⌘ + ⇧ + M (macOS) / Ctrl + Shift + M (Windows/Linux) toggles inline code,
// in addition to Tiptap default Mod-e
export const CodeShortcutExtension = Extension.create({
  name: "codeShortcut",

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-m": () => this.editor.commands.toggleCode()
    };
  }
});
