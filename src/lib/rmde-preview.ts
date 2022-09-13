/**
 * RhymixMarkdownEditor의 preview 관리 subclass
 */

import HtmlSanitizer from "./htmlSanitizer";
import diff from "./changeDiff";

declare global { interface Window { MathJax: any } }

class RmdePreview {

    getDocumentYFromLineNo(textLineNo: number, self: any) {
        var lineInfo = self.mainEditor.state.doc.line(textLineNo + 1);
        var blockInfo = self.mainEditor.lineBlockAt(lineInfo.from);
        return blockInfo.top;
    }

    // 주어진 행은 preview상에는 등록되어 있지 않을 수 있어 실제로 preview에 행이 등록되어 있는 textarea상의 행을 찾는다.
    getEffectiveLineNo(textLineNo: number) {
        // 해당 textLineNo에 해당하는 preview HTML이 없으면 나올 때까지 textLineNo를 줄여가며 찾는다. 
        for (var effTextLineNo = textLineNo; 
            $(`[data-source-line="${effTextLineNo}"]`).offset() === undefined && effTextLineNo >= 0; 
            effTextLineNo--);
        return effTextLineNo;
    }

    // 특정 행번호에 해당하는 preview HTML을 preview 상단으로 이동한다.
    movePreviewPositionByLineNo(textLineNo: number, self: any) {
        // 첫줄과 끝줄은 따로 처리한다.
        if(textLineNo === -2 || textLineNo === -1) this.movePreviewPosition(self, textLineNo);
        else {
            var effectiveTextLineNo = this.getEffectiveLineNo(textLineNo);
            // 앞 부분에 effectiveLineNo가 없으면 맨 앞으로 스크롤한다.
            if(effectiveTextLineNo == -1) this.movePreviewPosition(self, -2);
            else {
                // 해당 행이 위치하는 Y 좌표를 구해 거기서 에디터 상단 Y를 뺀 만큼이 스크롤량이다.
                var documentY = this.getDocumentYFromLineNo(effectiveTextLineNo, self); // 맨 윗줄에서 얼마나 떨어져 있느냐(픽셀단위)
                var scrollY = documentY + self.mainEditor.documentTop; // documentTop은 스크린 상에서의 위치(스크롤 반영)
                var top = $(self.rmde_editor).offset()!.top - $(document).scrollTop()!; // 에디터의 위치(스크롤 반영)
                this.movePreviewPosition(self, effectiveTextLineNo, false, scrollY - top);
            }
        }
    }

    // 지정된 markdown 행번호에 해당하는 preview HTML을 preview 상단으로 이동한다.
    movePreviewPosition(
        self: any,
        linenum: number,
        animate: boolean = false,
        slideDown: number = 0, // 스크롤 미세조정을 위해 얼마나 더 내릴 것인가(덜 끌어올릴 것인가) 결정
    ) {
        // 끝줄로 가면 끝줄 처리를 한다.
        if (linenum == -1) {
            $(self.rmde_preview_main).stop(true).animate({ scrollTop: $(self.rmde_preview_main).prop('scrollHeight'), }, 100, "linear");
            return;
        }
        else if (linenum == -2) {
            $(self.rmde_preview_main).stop(true).animate({ scrollTop: 0, }, 100, "linear"); // 첫 줄 처리
            return;
        }

        // 해당 행에 맞는 preview 위치로 preview 텍스트를 옮긴다.
        let offset = $(`[data-source-line="${linenum}"]`).offset(); // document 상 위치
        // TODO: 정의되어 있지 않을 경우 화면전환시 엉뚱한 곳으로 가는 경우가 있어 보정이 필요하다.
        if (typeof offset === 'undefined') return;
        let distance = offset.top - $(self.rmde_preview_main).offset()!.top;

        // 첫번째 줄이 정의되어 있지 않다면 맨 앞으로 스크롤하고 그렇지 않으면 적절히 계산해서 스크롤한다.
        let scrollval = // 첫 행을 document 기준 어느 Y좌표까지 끌어올릴지
            $(self.rmde_preview_main).scrollTop()! // 지금 스크롤된 분량을 초기화하는 분량
            + distance // 현재 목적행을 화면 맨 위로 옮기기 위해 끌어올릴 분량
            - slideDown; // 끌어내릴 분량
        if (scrollval < 0) scrollval = 0;

        $(self.rmde_preview_main).stop(true).animate({ scrollTop: scrollval, }, 100, "linear");

        // 선택 부위를 하이라이트한다.
        if (animate) {
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 0.4, }, 400);
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 1.0, }, 400);
        }
    }

    encodeReplacer(match: string, 
        p1: any, p2: any, p3: any, p4: any, p5: any, p6: any, p7: any, p8: any, p9: any, 
        pa: any, pb: any, pc: any, pd: any, offset: number, str: string) {
        // replaces '<' into '< ' not to make this into html tags.
        // encodeURIComponent에서 변환하지 않는 -_.!~\*\(\)'도 변환한다.(그러지 않으면 markdown-it이 변환해버림)
        return "\\\\(" + encodeURIComponent(match.replace("<", "&lt;")).replace(/([-_.!~\*\(\)']+)/gm, 
            function(match, p1, offset, str) {
                var ret_str = "";
                for(var i = 0; i < match.length; i++)
                    ret_str += "%" + match.charCodeAt(i).toString(16);
                return ret_str;
            }).replace(/%0A/gm, "\n") + "\\\\)"; // 줄바꿈은 변환하지 않아 줄 수 셀 때 오차가 없도록 한다.
    };

    decodeReplacer(match: string, p1: any, p2: any, p3: any, offset: number, str: string) {
        return decodeURIComponent(p2);

    };

    // 마크다운을 변환한다.
    convertMarkdownToHtml(self: any, markdownText: string) {
        if (typeof window.MathJax !== "undefined") 
        {       
            // ?는 non=greedy하게 잡기 위해 /gm은 여러줄에서 모든 매칭을 잡기 위해
            let escapedMarkdownText = markdownText.replace(
                /(\\\$)|(\\\[)([\w\W]+?)(\\\])|(\\\()([\w\W]+?)(\\\))|(\$\$)([\w\W]+?)(\$\$)|(\$)([\w\W]+?)(\$)/gm, this.encodeReplacer);
            let convertedText = HtmlSanitizer.SanitizeHtml(self.md.render(escapedMarkdownText));
            let unescapedLatexHtml = convertedText.replace(/(\\\()([\w\W]+?)(\\\))/gm, this.decodeReplacer);

            return unescapedLatexHtml;
        }
        else return HtmlSanitizer.SanitizeHtml(self.md.render(markdownText));
    }

    // MathJax를 포함한 마크다운을 변환한다.
    renderMarkdownTextToPreview(self: any) {
        if(self == null) self = this;

        // 변환한다.
        let convertedHTMLText = this.convertMarkdownToHtml(self, self.getMarkdownText());
        let elem = document.querySelector(self.rmde_preview_main);

        // 이전과 비교하여 바뀐 부분만 반영되도록 한다.
        diff.changeDiff(diff.stringToHTML(convertedHTMLText), elem);
        if (typeof window.MathJax !== "undefined" && typeof window.MathJax.typeset !== "undefined") {
            window.MathJax.texReset();
            window.MathJax.typesetPromise([elem]).then(()=>{})
            .catch((err: any)=>{console.log(err.message)});
        }
        self.previewTimer = null;
    }

    /**
     * Preview를 전환한다.
     * @param {*} self - mother class의 this 
     */
    togglePreview(self: any) {
        let preview_display = $(self.rmde_preview).css("display");
        let preview_float = $(self.rmde_preview).css("float");

        let editor_height;

        if (preview_display == "none") {
            editor_height = $(self.rmde_root).height()! - 30;

            $(self.rmde_editor).css("width", "50%");
            $(self.rmde_editor).css("float", "left");
            $(self.rmde_editor).css("height", editor_height);
            $(self.rmde_editor).css("height", editor_height);

            $(self.rmde_preview).show();
            $(self.rmde_preview_title).hide();
            $(self.rmde_preview).css("width", "50%");
            $(self.rmde_preview).css("float", "right");
            $(self.rmde_preview).css("height", $(self.rmde_editor).css("height"));
            $(self.rmde_preview_main).css("height", $(self.rmde_editor).css("height"));

            $(self.rmde_root).css(
                "height",
                $(self.rmde_toolbar).height()! + $(self.rmde_editor).height()! + 3 // border에 따른 오차보정
                // box-sizing:border-box 시 border 계산에서 height() 함수와 css("height")는 다른 값을 출력할 수 있다.

            );

            this.renderMarkdownTextToPreview(self);
            self.previewEnabled = true;
        } else if (preview_display == "block" && preview_float == "right") {
            editor_height = ($(self.rmde_root).height()! - 60) / 2;

            $(self.rmde_editor).css("width", "100%");
            $(self.rmde_editor).css("float", "none");
            $(self.rmde_editor).css("height", editor_height);
            $(self.rmde_editor).css("height", editor_height);

            $(self.rmde_preview).show();
            $(self.rmde_preview_title).show();
            $(self.rmde_preview).css("width", "100%");
            $(self.rmde_preview).css("float", "none");
            $(self.rmde_preview).css("height", editor_height + 30);
            $(self.rmde_preview_main).css("height", $(self.rmde_editor).css("height"));
            //$(self.rmde_preview).css("height", $(self.rmde_editor).css("height"));
            $(self.rmde_root).css("height",
                $(self.rmde_toolbar).height()! + $(self.rmde_editor).height()! + $(self.rmde_preview).height()! + 4 // border에 따른 오차보정
            );

            this.renderMarkdownTextToPreview(self);
            self.previewEnabled = true;
        } else {
            editor_height = $(self.rmde_root).height()! - 30;

            $(self.rmde_preview).hide();
            $(self.rmde_editor).css("height", editor_height);
            $(self.rmde_editor).css("height", editor_height);

            $(self.rmde_root).css("height",
                $(self.rmde_toolbar).height()! + $(self.rmde_editor).height()! + 3 // border에 따른 오차보정
            );

            self.previewEnabled = false;
        }
    }

}

export default RmdePreview;