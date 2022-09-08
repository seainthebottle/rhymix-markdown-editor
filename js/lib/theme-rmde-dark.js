// modified from codemirror/theme-one-dark

import {EditorView} from "@codemirror/view"
import {Extension} from "@codemirror/state"
import {HighlightStyle, syntaxHighlighting} from "@codemirror/language"
import {tags as t} from "@lezer/highlight"

// Using https://github.com/one-dark/vscode-one-dark-theme/ as reference for the colors

const chalky = "#e5c07b",
  coral = "#e06c75",
  cyan = "#56b6c2",
  invalid = "#ffffff",
  ivory = "#abb2bf",
  stone = "#7d8799", // Brightened compared to original to increase contrast
  malibu = "#61afef",
  sage = "#98c379",
  whiskey = "#d19a66",
  violet = "#c678dd",
  darkBackground = "#21252b",
  tooltipBackground = "#353a42",
  selection = "#3E4451",
  cursor = "#528bff",
  // custom
  foregroundDark = "#f4f4f4",
  backgroundDark = "#121212",
  highlightBackgroundDark = "#222222",
  gutterBackgroundDark = "#161b22"

/// The colors used in the theme, as CSS color strings.
export const color = {
  chalky,
  coral,
  cyan,
  invalid,
  ivory,
  stone,
  malibu,
  sage,
  whiskey,
  violet,
  darkBackground,
  tooltipBackground,
  selection,
  cursor,

  foregroundDark,
  backgroundDark,
  highlightBackgroundDark,
  gutterBackgroundDark
}

/// The editor theme styles for One Dark.
export const rmdeDarkTheme = EditorView.theme({
  "&": {
    "color": foregroundDark,
    "backgroundColor": backgroundDark
  },

  ".cm-content": {
    caretColor: cursor
  },

  ".cm-cursor, .cm-dropCursor": {borderLeftColor: cursor},
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {backgroundColor: selection},

  ".cm-panels": {backgroundColor: darkBackground, color: ivory},
  ".cm-panels.cm-panels-top": {borderBottom: "2px solid black"},
  ".cm-panels.cm-panels-bottom": {borderTop: "2px solid black"},

  // 검색
  ".cm-searchMatch": {
    backgroundColor: "#72a1ff59",
    outline: "1px solid rgb(140, 180, 255, 0.6)"
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#6199ff2f"
  },

  ".cm-activeLine": {backgroundColor: highlightBackgroundDark},
  ".cm-selectionMatch": {backgroundColor: "#aafe661a"},

  // 괄호 짝 맞추기
  "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
    backgroundColor: "#bad0f847",
    outline: "1px solid rgb(170, 190, 200, 0.6)"
  },

  ".cm-gutters": {
    backgroundColor: gutterBackgroundDark,
    color: stone,
    border: "none"
  },

  ".cm-activeLineGutter": {
    backgroundColor: highlightBackgroundDark
  },

  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "#ddd"
  },

  ".cm-tooltip": {
    border: "none",
    backgroundColor: tooltipBackground
  },
  ".cm-tooltip .cm-tooltip-arrow:before": {
    borderTopColor: "transparent",
    borderBottomColor: "transparent"
  },
  ".cm-tooltip .cm-tooltip-arrow:after": {
    borderTopColor: tooltipBackground,
    borderBottomColor: tooltipBackground
  },
  ".cm-tooltip-autocomplete": {
    "& > ul > li[aria-selected]": {
      backgroundColor: highlightBackgroundDark,
      color: ivory
    }
  }
}, {dark: true})

/// The highlighting style for code in the Rmde Dark theme.
export const rmdeHighlightStyleDark = HighlightStyle.define([
  {tag: t.keyword, color: violet},
  {tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: coral},
  {tag: [t.function(t.variableName), t.labelName], color: malibu},
  {tag: [t.color, t.constant(t.name), t.standard(t.name)], color: whiskey},
  {tag: [t.definition(t.name), t.separator],color: ivory},
  {tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: chalky},
  {tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: cyan},
  {tag: [t.meta, t.comment], color: stone},
  {tag: t.strong, fontWeight: "bold"}, //
  {tag: t.emphasis, fontStyle: "italic"}, //
  {tag: t.strikethrough, textDecoration: "line-through"}, //  
  {tag: t.link, color: stone, textDecoration: "underline"}, //
  {tag: t.heading, fontWeight: "bold", color: coral}, //
  {tag: [t.list, t.atom, t.bool, t.special(t.variableName)], color: coral}, //
  {tag: t.processingInstruction, color: sage}, //
  {tag: [t.string, t.inserted], color: foregroundDark},
  {tag: t.invalid, color: invalid},
  {tag: t.special(t.content), color: malibu} //
]);

/// Extension to enable the One Dark theme (both the editor theme and
/// the highlight style).
export const rmdeDark = [rmdeDarkTheme, syntaxHighlighting(rmdeHighlightStyleDark)];