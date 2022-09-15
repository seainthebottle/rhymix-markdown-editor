import {InlineContext, BlockContext, MarkdownConfig,
    LeafBlockParser, LeafBlock, Line, Element} from "./markdown"
import {tags as t} from "@lezer/highlight";

/**
 * $, \(), \) 으로 Tex가 escape 된 부분을 파싱한다.
 * @param {string} node
 * @param {string} mark 
 * @returns 
 */
function parseTexInline(node: string, mark: string) {
    return (cx: InlineContext, next: number, pos: number) => {
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

/**
 * $$, \[, \] 으로 Tex가 escape 된 부분을 파싱한다.
 * @param {string} node
 * @param {string} mark 
 * @returns 
 */
function parseTexBlock(node: string, mark: string) {
    return (cx: InlineContext, next: number, pos: number) => {
        if (next != 36 || cx.char(pos + 1) != 36) { //'$$'가 아닐 때
            if (next != 92 || cx.char(pos + 1) != 91) return -1;} //'/['도 아니면 나간다.
        let elts = [cx.elt(mark, pos, pos + 2)]
        for (let i = pos + 1; i < cx.end; i++) {
            let next = cx.char(i)
            // 구분자와 같으면 끝에 다다렀으므로 추가
            if ((next == 36 && cx.char(i + 1) == 36)    // '$$'
                || (next == 92 && cx.char(i + 1) == 93)) { // '\]'
                    //console.log(cx.text.slice(pos - cx.offset))
                    return cx.addElement(cx.elt(node, pos, i + 2, elts.concat(cx.elt(mark, i, i + 2))))
            }
      }
      return -1
    }
}

/**
 * ==로 마킹된 부분을 파싱한다. 
 * @param {string} node
 * @param {string} mark 
 * @returns 
 */
function parseMark(node: string, mark: string) {
    return (cx: InlineContext, next: number, pos: number) => {
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
 * Tex inline을 파싱한다.
 */
export const mdpTexInline: MarkdownConfig = {
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

/**
 * Tex block inline을 파싱한다.
 */
export const mdpTexBlock: MarkdownConfig = {
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

/**
 * Mark inline을 파싱한다.
 */
export const mdpMark: MarkdownConfig = {
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
 *  mdpFootnote 보조용 클래스
 */
 class FootnoteParser implements LeafBlockParser {
    // 다음줄에 대하여 파서의 상태를 갱신한다.
    // 첫 줄에서는 호출되지 않는다.
    // true를 리턴하면 블록은 종료된다.
    // false를 리턴하면 다른 파서가 먼저 맞는 게 있으면 그것을 적용한다. 
    nextLine() { 
        console.log("nextLine")
        return false;
    }

    // 끝줄이면
    finish(cx: BlockContext, leaf: LeafBlock) {
        return this.complete(cx, leaf);
    }

    complete(cx: BlockContext, leaf: LeafBlock) {
        // 파싱 트리에 해당 잎들을 붙여준다.
        var reg = /^((?:(?:\[\^)|(?:\*\[)).+?\]:)/;
        var count = (reg.test(leaf.content)) ? reg.exec(leaf.content)![1].length : 0;
        cx.addLeafElement(leaf, cx.elt("Footnote", leaf.start, leaf.start + leaf.content.length,  [
            cx.elt("FootnoteMark", leaf.start, leaf.start + 2),
            cx.elt("FootnoteLabel", leaf.start + 2, leaf.start + count - 2),
            cx.elt("FootnoteMark", leaf.start + count - 2, leaf.start + count),
            ...cx.parser.parseInline(leaf.content.slice(count), leaf.start + count) // parseInline으로 해서 안의 block이 인식이 안 되는 문제가 있다.
        ]))
        return true;
    }
}

/**
 * Reference와 Abbreviation block을 파싱한다.
 */
export const mdpFootnote: MarkdownConfig = {
    defineNodes: [
      {name: "Footnote", block: true},
      {name: "FootnoteLabel", style: t.keyword},
      {name: "FootnoteMark", style: t.processingInstruction}
    ],
    parseInline: [{
        name: "Footnote",
        parse(cx, next, pos) {
            const match = /^((?:(?:\[\^)|(?:\*\[)).+?\])/.exec(cx.text.slice(pos - cx.offset));
            if (match) {
                const end = pos + match[0].length;
                return cx.addElement(
                    cx.elt("Footnote", pos, end, [
                        cx.elt("FootnoteMark", pos, pos + 2),
                        cx.elt("FootnoteLabel", pos + 2, end - 1),
                        cx.elt("FootnoteMark", end - 1, end),
                    ])
                );
            }
            return -1;
        },
        before: "Entity",
    }],
    parseBlock: [{
        name: "Footnote",
        leaf(cx, leaf) { console.log("test", leaf.content, (/^((?:(?:\[\^)|(?:\*\[)).+?\]:)/.test(leaf.content))); return (/^((?:(?:\[\^)|(?:\*\[)).+?\]:)/.test(leaf.content)) ? new FootnoteParser : null },
        // 아래 조건을 만족하면 한 줄을 안 띄워도 전 block을 마치고 바로 block을 시작한다.
        endLeaf(cx, line, leaf) { return (/^((?:(?:\[\^)|(?:\*\[)).+?\]:)/.test(leaf.content)) ? true : false },
        before: "LinkReference"
    }]
}