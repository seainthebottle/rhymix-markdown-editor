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

/**
 * GetCustomeTheme
 */
export function getCustomStyle(style, isDark) {
    return EditorView.theme(
        {
            "&": {
                "color": style.foreground,
                "backgroundColor": style.background
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

            ".cm-activeLine": {backgroundColor: style.highlightBackground},
            ".cm-selectionMatch": {backgroundColor: "#aafe661a"},

            // 괄호 짝 맞추기
            "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
                backgroundColor: "#bad0f847",
                outline: "1px solid rgb(170, 190, 200, 0.6)"
            },

            ".cm-gutters": {
                backgroundColor: style.gutterBackground,
                color: stone,
                border: "none"
            },

            ".cm-activeLineGutter": {
                backgroundColor: style.highlightBackground
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
                backgroundColor: style.highlightBackground,
                color: ivory
                }
            }
        }, 
        {dark: isDark}
    )
}

/// The highlighting style for code in the Rmde Dark theme.
export function getCustomHighlight(highlight) {
    return HighlightStyle.define([
        {tag: t.keyword, ...highlight.keyword},
        {tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: coral},
        {tag: [t.function(t.variableName), t.labelName], color: malibu},
        {tag: [t.color, t.constant(t.name), t.standard(t.name)], color: whiskey},
        {tag: [t.definition(t.name), t.separator],color: ivory},
        {tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: chalky},
        {tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: cyan},
        {tag: [t.meta, t.comment], color: stone},
        {tag: t.strong, ...highlight.strong}, 
        {tag: t.emphasis, ...highlight.emphasis}, 
        {tag: t.strikethrough, ...highlight.strikethrough}, 
        {tag: t.link, ...highlight.link},
        {tag: t.heading, ...highlight.heading},
        {tag: [t.atom, t.bool, t.special(t.variableName)], color: coral},
        {tag: t.processingInstruction, ...highlight.processingInstruction},
        {tag: [t.string, t.inserted], color: foregroundDark},
        {tag: t.invalid, color: invalid},
        {tag: t.special(t.content), ...highlight.tex}
    ]);
}

export function getCustomeTheme(theme) {
    return [
        getCustomStyle(theme.style, theme.isDark),
        syntaxHighlighting(getCustomHighlight(theme.highlight))
    ]
}

/// Extension to enable the One Dark theme (both the editor theme and
/// the highlight style).
//export const rmdeDark = [rmdeDarkTheme, syntaxHighlighting(rmdeHighlightStyleDark)];