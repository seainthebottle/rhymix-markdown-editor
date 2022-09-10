import {InlineContext, BlockContext, MarkdownConfig,
    LeafBlockParser, LeafBlock, Line, Element, space} from "@lezer/markdown"
import {tags as t} from "@lezer/highlight";

function parseTexInline(node, mark) {
    return (cx, next, pos) => {
        if (next != 36 || cx.char(pos + 1) == 36) { //'$'가 아니거나 '$$'일 때
            if (next != 92 || cx.char(pos + 1) != 40) return -1;} //'/('도 아니면 나간다.
        var q = (next == 36)? 0 : 1;
        let elts = [cx.elt(mark, pos, pos + 1 + q)]
        for (let i = pos + 1; i < cx.end; i++) {
            let next = cx.char(i)
            // 구분자와 같으면 끝에 다다렀으므로 추가
            if ((next == 36)    // '$'
                || (next == 92 && cx.char(i + 1) == 41)) { // '\)'
                    var p = (next == 36)? 0 : 1;
                return cx.addElement(cx.elt(node, pos, i + 1 + p, elts.concat(cx.elt(mark, i, i + 1 + p))))
            }
        }
        return -1
    }
}

// $$, \[, \] 으로 Tex가 escape 된 부분을 파싱한다.
function parseTexBlock(node, mark) {
    return (cx, next, pos) => {
        if (next != 36 || cx.char(pos + 1) != 36) { //'$$'가 아닐 때
            if (next != 92 || cx.char(pos + 1) != 91) return -1;} //'/['도 아니면 나간다.
        let elts = [cx.elt(mark, pos, pos + 2)]
        for (let i = pos + 1; i < cx.end; i++) {
            let next = cx.char(i)
            // 구분자와 같으면 끝에 다다렀으므로 추가
            if ((next == 36 && cx.char(i + 1) == 36)    // '$$'
                || (next == 92 && cx.char(i + 1) == 93)) { // '\]'
                return cx.addElement(cx.elt(node, pos, i + 2, elts.concat(cx.elt(mark, i, i + 2))))
            }
      }
      return -1
    }
}

// ==로 마킹된 부분을 파싱한다.
function parseMark(node, mark) {
    return (cx, next, pos) => {
        if (next != 61 || cx.char(pos + 1) != 61) return -1; //'=='가 아닐 때 나간다.
        let elts = [cx.elt(mark, pos, pos + 2)]
        for (let i = pos + 1; i < cx.end; i++) {
            let next = cx.char(i)
            // 구분자와 같으면 끝에 다다랐으므로 추가
            if (next == 61 && cx.char(i + 1) == 61) {   // '=='
                return cx.addElement(cx.elt(node, pos, i + 2, elts.concat(cx.elt(mark, i, i + 2))))
            }
      }
      return -1
    }
}

/**
 *  [^,]: 로 reference를 기재한 부분을 파싱한다.
 */
function parseReferenceText(node, mark) {
    return (cx, next, pos) => {
        if (next != 91 || cx.char(pos + 1) != 94) return -1; //'[^'가 아닐 때 나간다.
        let elts = [cx.elt(mark, pos, pos + 2)]
        for (let i = pos + 1; i < cx.end; i++) {
            let next = cx.char(i)
            if (next == 93 && cx.char(i + 1) == 58) {   // ']:'
                return cx.addElement(cx.elt(node, pos, i + 2, elts.concat(cx.elt(mark, i, i + 2))))
            }
      }
      return -1
    }
}

export const mdpTexInline = {
    defineNodes: [
      {name: "TexInline", style: t.special(t.content)},
      {name: "TexInlineMark", style: t.processingInstruction}
    ],
    parseInline: [{
      name: "TexInline",
      parse: parseTexInline("TexInline", "TexInlineMark"),
      before: "Escape"  // \(, \) 가 인식되기 위해 
    }]
}

export const mdpTexBlock = {
    defineNodes: [
      {name: "TexBlock", style: t.special(t.content)},
      {name: "TexBlockMark", style: t.processingInstruction}
    ],
    parseInline: [{
      name: "TexBlock",
      parse: parseTexBlock("TexBlock", "TexBlockMark"),
      before: "Escape" // \[, \] 가 인식되기 위해 
    }]
}

export const mdpMark = {
    defineNodes: [
      {name: "Mark", style: t.strong},
      {name: "MarkMark", style: t.processingInstruction}
    ],
    parseInline: [{
      name: "Mark",
      parse: parseMark("Mark", "MarkMark")
    }]
}

/**
 *  mdpReferenceText 보조용 클래스
 */
class ReferenceParser {
    // 다음줄에 대하여 파서의 상태를 갱신한다.
    // 첫 줄에서는 호출되지 않는다.
    // true를 리턴하면 블록은 종료된다. 
    nextLine(cx, line, leaf) { return false }

    // 끝줄이면
    finish(cx, leaf) {
        // 파싱 트리에 해당 잎들을 붙여준다.
        var reg = /^((?:(?:\[\^)|(?:\*\[)).+?\]:)/;
        var count = (reg.test(leaf.content)) ? reg.exec(leaf.content)[1].length : 0;
        cx.addLeafElement(leaf, cx.elt("ReferenceText", leaf.start, leaf.start + leaf.content.length,  [
            cx.elt("ReferenceTextMark", leaf.start, leaf.start + 2),
            cx.elt("ReferenceTextName", leaf.start + 2, leaf.start + count - 2),
            cx.elt("ReferenceTextMark", leaf.start + count - 2, leaf.start + count),
            ...cx.parser.parseInline(leaf.content.slice(count), leaf.start + count) // parseInline으로 해서 안의 block이 인식이 안 되는 문제가 있다.
        ]))
        return true;
    }
}

/// Parse the given piece of inline text at the given offset,
/// returning an array of [`Element`](#Element) objects representing
/// the inline content.
//   parseInline(text: string, offset: number) {
//     let cx = new InlineContext(this, text, offset)
//     outer: for (let pos = offset; pos < cx.end;) {
//       let next = cx.char(pos)
//       for (let token of this.inlineParsers) if (token) {
//         let result = token(cx, next, pos)
//         if (result >= 0) { pos = result; continue outer }
//       }
//       pos++
//     }
//     return cx.resolveMarkers(0)
//   }

/**
 * Reference와 Abbreviation block을 파싱한다.
 */
export const mdpReferenceText = {
    defineNodes: [
      {name: "ReferenceText", block: true},
      {name: "ReferenceTextName", style: t.keyword},
      {name: "ReferenceTextMark", style: t.processingInstruction}
    ],
    parseBlock: [{
        name: "ReferenceText",
        leaf(cx, leaf) { return (/^((?:(?:\[\^)|(?:\*\[)).+?\]:)/.test(leaf.content)) ? new ReferenceParser : null },
        before: "LinkReference"
    }]
}
// TODO: LinkReference가 조건에 맞으면 위의 순서 지정에도 불구하고 LinkReference가 적용되며
// 새로운 block으로도 인정되지 못하는 버그가 파서에 있는 것 같다.