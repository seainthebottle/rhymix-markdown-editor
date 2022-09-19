import {InlineContext, BlockContext, MarkdownConfig,
    LeafBlockParser, LeafBlock, Line, Element, space} from "./markdown"
import {tags as t} from "@lezer/highlight";

/**
 * $, \\(, \\) 으로 Tex가 escape 된 부분을 파싱한다. (Pandoc 메뉴얼에 따름(https://pandoc.org/MANUAL.html#math))
 * @param {string} node 
 * @param {string} mark 
 * @returns 
 */
function parseTexInline(node, mark) {
    return (cx, next, pos) => {
        if (next != 36 || cx.char(pos + 1) == 36 || cx.char(pos + 1) == 9/* \t */ || cx.char(pos + 1) == 32/* ' ' */) { //'$'가 아니거나 '$$'일 때 혹은 $뒤에 공백문자가 있을 때
            if (next != 92 || cx.char(pos + 1) != 92 || cx.char(pos + 2) != 40) return -1;} // '\\('도 아니면 나간다.
        var prenext = next;
        var q = (next == 36)? 0 : 2; // '\\('이면 위치를 조정
        let elts = [cx.elt(mark, pos, pos + 1 + q)]
        for (let i = pos + 1; i < cx.end; i++) {
            let next = cx.char(i)
            if(prenext != next) continue; // $면 $, \\(면 \\)와 짝이 맞아야 한다.
            // 구분자와 같으면 끝에 다다렀으므로 추가
            if ((next == 36)   // '$'
                || (next == 92 && cx.char(i + 1) == 92 && cx.char(i + 2) == 41)) { // '\\)'
                if(next == 36 && 
                    ((cx.char(i - 1) == 9 /* \t */ || cx.char(i - 1) == 32 /* ' ' */ ) || // 앞에 공백 문자가 있거나
                     (cx.char(i + 1) >= 48 /* 0 */ && cx.char(i + 1) <= 57 /* 9 */) ) ) // 뒤에 숫자가 있으면
                        return -1;  // 무효
                var p = (next == 36)? 0 : 2; // '\\)'이면 위치를 조정
                return cx.addElement(cx.elt(node, pos, i + 1 + p, elts.concat(cx.elt(mark, i, i + 1 + p))))
            }
        }
        return -1
    }
}

/**
 * $$, \\[, \\] 으로 Tex가 escape 된 부분을 파싱한다.
 * @param {string} node 
 * @param {string} mark 
 * @returns 
 */
function parseTexBlock(node, mark) {
    return (cx, next, pos) => {
        if (next != 36 || cx.char(pos + 1) != 36) { //'$$'가 아닐 때
            if (next != 92 || cx.char(pos + 1) != 92 || cx.char(pos + 2) != 91) return -1;} //'\\['도 아니면 나간다.
        var prenext = next;
        var q = (next == 36)? 0 : 1; // '\\['이면 위치를 조정
        let elts = [cx.elt(mark, pos, pos + 2 + q)]
        for (let i = pos + 1; i < cx.end; i++) {
            let next = cx.char(i)
            if(prenext != next) continue; // $$면 $$, \\[면 \\]와 짝이 맞아야 한다.
            // 구분자와 같으면 끝에 다다렀으므로 추가
            if ((next == 36 && cx.char(i + 1) == 36)    // '$$'
                || (next == 92 && cx.char(i + 1) == 92 && cx.char(i + 2) == 93)) { //'\\]'
                var p = (next == 36)? 0 : 1; // '\\]'이면 위치를 조정
                return cx.addElement(cx.elt(node, pos, i + 2 + p, elts.concat(cx.elt(mark, i, i + 2 + p))))
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
 * 
 */
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

/**
 * 
 */
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

/**
 * 
 */
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
 *  mdpFootnote 보조용 클래스
 */
 class FootnoteParser {
    // 다음줄에 대하여 파서의 상태를 갱신한다.
    // 첫 줄에서는 호출되지 않는다.
    // true를 리턴하면 블록은 종료된다.
    // false를 리턴하면 다른 파서가 먼저 맞는 게 있으면 그것을 적용한다. 
    nextLine(cx, line, leaf) { 
        return false;
    }
    
    // 끝줄이면
    finish(cx, leaf) {
        return this.complete(cx, leaf);
    }

    complete(cx, leaf) {
        // 파싱 트리에 해당 잎들을 붙여준다.
        var reg = /^((?:(?:\[\^)|(?:\*\[)).+?\]:)/;
        var count = (reg.test(leaf.content)) ? reg.exec(leaf.content)[1].length : 0;
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
export const mdpFootnote= {
    defineNodes: [
      {name: "Footnote", block: true},
      {name: "FootnoteLabel", style: t.keyword},
      {name: "FootnoteMark", style: t.processingInstruction}
    ],
    parseInline: [{
        name: "Footnote",
        parse(cx, _, pos) {
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
        leaf(cx, leaf) { return (/^((?:(?:\[\^)|(?:\*\[)).+?\]:)/.test(leaf.content)) ? new FootnoteParser : null },
        // 아래 조건을 만족하면 한 줄을 안 띄워도 전 block을 마치고 바로 block을 시작한다.
        endLeaf(cl, line, leaf) { return (/^((?:(?:\[\^)|(?:\*\[)).+?\]:)/.test(line.text)) ? true : false },
        before: "LinkReference"
    }]
}