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

// [^,]: 로 reference를 기재한 부분을 파싱한다.
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


/// Objects that are used to [override](#BlockParser.leaf)
/// paragraph-style blocks should conform to this interface.
// export interface LeafBlockParser {
//     /// Update the parser's state for the next line, and optionally
//     /// finish the block. This is not called for the first line (the
//     /// object is contructed at that line), but for any further lines.
//     /// When it returns `true`, the block is finished. It is okay for
//     /// the function to [consume](#BlockContext.nextLine) the current
//     /// line or any subsequent lines when returning true.
//     nextLine(cx: BlockContext, line: Line, leaf: LeafBlock): boolean
//     /// Called when the block is finished by external circumstances
//     /// (such as a blank line or the [start](#BlockParser.endLeaf) of
//     /// another construct). If this parser can handle the block up to
//     /// its current position, it should
//     /// [finish](#BlockContext.addLeafElement) the block and return
//     /// true.
//     finish(cx: BlockContext, leaf: LeafBlock): boolean
//   }
class ReferenceParser {
    rows = null;

    // 다음줄에 대하여 파서의 상태를 갱신한다.
    // 첫 줄에서는 호출되지 않는다.
    // true를 리턴하면 블록은 종료된다. 

    nextLine(cx, line, leaf) { 
        console.log("nextLine", cx, "line:",line, leaf); // cx: BlockContext
        /*if(this.rows == null) {
            this.rows = false;
            var reg = /^\[\^.+\]:(.*)/;
            console.log("reg", leaf.content, reg.exec(leaf.content)) 
            var count = (reg.test(leaf.content)) ? reg.exec(leaf.content)[0].length : 0;
            this.rows = [cx.elt("ReferenceTextHeader", leaf.start, leaf.start + count),   // 처음 마커
                         cx.elt("ReferenceTextContent", leaf.start + count, leaf.start + line.text.length)];//,  // 이후 내용
                            //cx.parser.parseInline(line.slice(count, line.text.length), leaf.start + count))];
        }
        else {
            var content = [cx.elt("TableCell", cx.lineStart + line.pos, cx.lineStart + line.text.length,
                cx.parser.parseInline(line.slice(cellStart, cellEnd), offset + cellStart))];
            this.rows.push(cx.elt("ReferenceTextContent", cx.lineStart + line.pos, cx.lineStart + line.text.length));
        }*/

        return false; 
    }

/// Create an [`Element`](#Element) object to represent some syntax
/// node.
//   elt(type: string, from: number, to: number, children?: readonly Element[]): Element
//   elt(tree: Tree, at: number): Element
//   elt(type: string | Tree, from: number, to?: number, children?: readonly Element[]): Element {
//     if (typeof type == "string") return elt(this.parser.getNodeType(type), from, to!, children)
//     return new TreeElement(type, from)
//   }

    // 끝줄이면
    finish(cx, leaf) {
        console.log("finish", cx, leaf)
        // 파싱 트리에 해당 잎들을 붙여준다.
        var reg = /^(\[\^.+\]:)(.*)/;
        var count = (reg.test(leaf.content)) ? reg.exec(leaf.content)[1].length : 0;
        console.log("reg", count, leaf.content, reg.exec(leaf.content)) 
        cx.addLeafElement(leaf, cx.elt("ReferenceText", leaf.start, leaf.start + leaf.content.length,  [
            cx.elt("ReferenceTextHeader", leaf.start, leaf.start + count),
            ...cx.parser.parseInline(leaf.content.slice(count), leaf.start + count)
        ]))
        return true
    }
}

export const mdpReferenceText = {
    defineNodes: [
      {name: "ReferenceText", block: true},
      {name: "ReferenceTextContent", style: t.link},
      {name: "ReferenceTextHeader", style: t.processingInstruction}
    ],
    parseBlock: [{
        name: "ReferenceTextContent",
        /// A leaf parse function. If no [regular](#BlockParser.parse) parse
        /// functions match for a given line, its content will be
        /// accumulated for a paragraph-style block. This method can return
        /// an [object](#LeafBlockParser) that overrides that style of
        /// parsing in some situations.
        leaf(cx, leaf) {
            console.log("test")
            if(/^\[\^.+\]:/.test(leaf.content)) console.log("leaf", cx, leaf)
            return /^\[\^.+\]:/.test(leaf.content) ? new ReferenceParser : null;
        },
        /// Some constructs, such as code blocks or newly started
        /// blockquotes, can interrupt paragraphs even without a blank line.
        /// If your construct can do this, provide a predicate here that
        /// recognizes lines that should end a paragraph (or other non-eager
        /// [leaf block](#BlockParser.leaf)).
        //   endLeaf(cx, line, leaf) {
        //     if (leaf.parsers.some(p => p instanceof ReferenceParser) || !hasPipe(line.text, line.basePos)) return false
        //     let next = cx.scanLine(cx.absoluteLineEnd + 1).text
        //     return delimiterLine.test(next) && parseRow(cx, line.text, line.basePos) == parseRow(cx, next, line.basePos)
        //   },
        /*leaf(_, leaf) { return hasPipe(leaf.content, 0) ? new TableParser : null },
        endLeaf(cx, line, leaf) {
            if (leaf.parsers.some(p => p instanceof TableParser) || !hasPipe(line.text, line.basePos)) return false
            let next = cx.scanLine(cx.absoluteLineEnd + 1).text
            return delimiterLine.test(next) && parseRow(cx, line.text, line.basePos) == parseRow(cx, next, line.basePos)
        },*/
        before: "LinkReference"
    }]
}