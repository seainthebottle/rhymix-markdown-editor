import $ from "jquery";
import MarkdownIt from "markdown-it";
import mdiFootNote_ from "markdown-it-footnote";
import mdiAbbr_ from "markdown-it-abbr";
import mdiMark_ from "markdown-it-mark";
import mdiImsize_ from "markdown-it-imsize";
import mdiDeflist_ from "markdown-it-deflist";
import TurndownService from "turndown";
import HtmlSanitizer from "./lib/htmlSanitizer";
import diff from "./lib/changeDiff";
import markdown_it_inject_linenumbers from "./lib/markdown-it-inject-linenumbers";

import {basicSetup} from "codemirror";
import {EditorView} from "@codemirror/view";
import {EditorState} from "@codemirror/state";
import {markdown} from "@codemirror/lang-markdown";
import {oneDark} from "@codemirror/theme-one-dark";

export const mdiFootNote = mdiFootNote_;
export const mdiAbbr = mdiAbbr_;
export const mdiMark = mdiMark_;
export const mdiImsize = mdiImsize_;
export const mdiDeflist = mdiDeflist_;

class RhymixMarkdownEditor {
    constructor(editor_id) {
        this.previewEnabled = false;
        this.totalHeight = 600;
        this.resizeTimer = null;
        this.previewTimer = null;
        this.mathJaxTimer = null;
        this.autosaveTimer = null;
        this.autosaveFlag = false;

        this.mousepagex = null;
        this.mousepagey = null;

        this.arrowKeyDown = false;
        this.onPasteInput = false;

        this.mainEditor = null;

        this.bottom_tag_head = "<code id='RhymixMarkdownEditor-MarkdownText' style='display:none'>";
        this.bottom_tag_tail = "</code>";
        
        this.id = editor_id;
        this.rmde_root = editor_id + " .rmde_class_root";
        this.rmde_toolbar = editor_id + " .rmde_toolbar";
        this.rmde_editor_notification = editor_id + " #rmde_editor_notification";
        this.rmde_btn_preview = editor_id + " .rmde_btn_preview";
        this.rmde_editor = editor_id + " .rmde_editor";
        this.rmde_preview = editor_id + " .rmde_preview";
        this.rmde_preview_title = editor_id + " .rmde_preview_title";
        this.rmde_preview_main = editor_id + " .rmde_preview_main";
        this.rmde_status_autosave_on = editor_id + " #rmde_status_autosave_on";
        this.rmde_status_mathjax_on = editor_id + " #rmde_status_mathjax_on";

        this.docuClientTop = null;
    }

    // HTML 골조를 만들고 이벤트 처리기를 달아준다.
    build(content_key) {
        let self = this;

        this.content_key = content_key;

        let html_data = '\
        <div class="rmde_class_root">\
            <div class="rmde_toolbar">\
                <ul>\
                    <li><button type="button" class="rmde_btn_preview">Preview</button></li>\
                    <li id="rmde_status_autosave_on" class="rmde_status_indicator">Autosave ON</li>\
                    <li id="rmde_status_mathjax_on" class="rmde_status_indicator">MathJax ON</li>\
                </ul>\
            </div>\
            <div id="rmde_editor_notification" class="rmde_editor_notification">Notification</div>\
            <div class="rmde_editor"></div>\
            <div class="rmde_preview">\
                <div class="rmde_preview_title">Preview screen</div>\
                <div class="rmde_preview_main rhymix_content"></div>\
            </div>\
        </div>';
        // .rmde_class_root에 위의 html을 삽입한다.
        $(this.id).html(html_data);
        // 초기에 preview는 숨긴다.
        $(this.rmde_preview).hide();


        // 에디터를 생성한다.
        const fixedHeightEditor = EditorView.theme({
            "&.cm-editor": {height: "100%"},
            ".cm-scroller": {overflow: "auto"}
        });

        // 이벤트 분배기(ViewUpdate class 참조)
        let eventHandler = EditorView.updateListener.of((v) => {
            // 내용이 변경된 경우
            if (v.docChanged) this.onDocumentChanged();
            // 화면의 크기가 바뀌는 경우
            else if (v.geometryChanged) {}
        });

        // 스크롤 이벤트는 여기에서 분배
        let domeventhandler = EditorView.domEventHandlers({
            scroll(event, view) { self.onScroll(event, view, self) }            
        });
          
        let state = EditorState.create({
            extensions: [
                basicSetup,
                fixedHeightEditor,
                EditorView.lineWrapping,
                oneDark,
                markdown(),
                eventHandler,
                domeventhandler
            ]
        });
        
        this.mainEditor = new EditorView({
            doc: "", state,
            parent: document.querySelector(this.rmde_editor) 
        });

        this.docuClientTop = this.mainEditor.documentTop; // 줄에 걸친 행을 구할 때 사용


        // 자동저장이 지정되어 있으면 표시한다.
        if(typeof RhymixMarkdownEditorSettings != 'undefined' &&
            typeof RhymixMarkdownEditorSettings.autosave !== 'undefined' && 
            RhymixMarkdownEditorSettings.autosave)
            {
                this.autosaveFlag = true;
                $(this.rmde_status_autosave_on).css("display", "inline-block");
            }
        else 
            $(this.rmde_status_autosave_on).css("display", "none");
        // MathJax가 로딩되어 있으면 표시한다.
        if (typeof MathJax !== "undefined")
            $(this.rmde_status_mathjax_on).css("display", "inline-block");
        else
            $(this.rmde_status_mathjax_on).css("display", "none");

        
        ///////////////////////////////////////////////////////////////////////
        // 이벤트 처리를 해 준다.

        var getFirstVisibleRow = function (self) {  // 0-based
            var heightAtClient = self.docuClientTop - self.mainEditor.documentTop;
            if(heightAtClient < 0) heightAtClient = 0;
            var block = self.mainEditor.lineBlockAtHeight(heightAtClient);
            var rownum = self.mainEditor.state.doc.lineAt(block.from).number - 1;
            //console.log("rownum", rownum);
            return rownum;
        }

        // Preview 버튼이 눌러진 경우
        $(this.rmde_btn_preview).on("click", function () {
            self.togglePreview();
            if (self.previewEnabled) {
                // 에디터 화면 맨 위에 걸린 텍스트에 맞추어 preview를 스크롤한다.
                self.movePreviewPositionByLineNo(getFirstVisibleRow(self), self);
            }
        });

        //// 각종 키 처리를 해 준다. ////
        $(window).on("keydown", function (e) {
            let keyCode = e.key || e.keyCode;
            // Alt+`의 경우 preview를 토글한다.
            if (keyCode === "`" && e.altKey) {
                self.togglePreview();
                // preview 직후에 미처 에디터가 다 전환되지 않은 상태에서 리턴되므로
                // 조금 여유를 두고 preview를 스크롤한다. (TODO: 나중에 아예 확실한 대책 마련 필요)
                if (self.previewEnabled) {
                    // 단축키로 전환시에는 대개 커서 위치에 작업중인 경우가 많아 preview를 커서 쪽으로 맞추는 것이 좋다.
                    //console.log("keydown")
                    setTimeout(self.scrollPreviewAsTextareaCursor, 200, self);
                }
            }
        });

        /////////// 에디터 전용 //////////////

        // 편집창에서 마우스 클릭될 때 preview 위치도 조정해준다.
        // TODO: 편집창의 맨 윗줄이 자꾸 변동되므로 일관성 있게 유지되게 해 준다.
        $(this.rmde_editor).on("click", function (e) {
            //self.getHtmlData()
            // preview가 열려 있을 때만 조정한다.
            if (self.previewEnabled) self.scrollPreviewAsTextareaCursor(self);
        });

        // 키 이벤트 처리기로 추후에 단축키 설정에 통합시켜야 한다.
        document.querySelector(this.rmde_editor).addEventListener("keydown", function (e) {
            let keyCode = e.key || e.keyCode;
            // 탭키가 눌러지면 편집창을 벗어나지 않고 탭을 넣을 수 있도록 해 준다.
            if (keyCode === "Tab") {
                e.preventDefault();
                document.execCommand('insertText', false, "\t");
                return false;
            }

            // Ctrl+s의 경우 임시저장한다.
            if (keyCode === "s" && e.ctrlKey) {
                e.preventDefault();
                self.contentSave(self);
            }

            // 방향키로 스크롤될 때에는 preview 스크롤이 스크롤 이벤트에서 처리되지 않고 keyup 이벤트로 처리되게 한다.
            else if (keyCode === "PageUp" || keyCode === "PageDown" || 
            keyCode === "ArrowUp" || keyCode === "ArrowDown" || keyCode === "ArrowLeft" || keyCode === "ArrowRight") self.arrowKeyDown = true;

            // 엔터키를 입력하면 키입력에 맞추어 스크롤 되게 한다.
            else if (keyCode === "Enter") self.onPasteInput = true;
        });

        // 키보드로 커서 이동시 스크롤도 함께 되도록 한다.
        document.querySelector(this.rmde_editor).addEventListener("keyup", function (e) {
            let keyCode = e.key || e.keyCode;
            if (keyCode === "PageUp" || keyCode === "PageDown" || 
                keyCode === "ArrowUp" || keyCode === "ArrowDown" || keyCode === "ArrowLeft" || keyCode === "ArrowRight") {//} ||
                //(keyCode == "Enter" && self.enterLastLine)) { // 엔터로 내용이 바뀌면 이에 맞추어 업데이트 되는데 필요할 지...
                self.arrowKeyDown = false;  
                self.enterLastLine = false;  
                //console.log("keyup")
                if (self.previewEnabled) self.scrollPreviewAsTextareaCursor(self);
            }
        });

        // 스크롤이 더 되지는 않으나 휠을 돌릴 때 처리를 한다.
        //this.mainEditor.session.on("changeScrollTop", // 이거는 더 스크롤 안되면 호출도 안된다.
        document.querySelector(this.rmde_editor).addEventListener("mousewheel", 
            (e) => {
                // 키보드가 움직여 스크롤할때는 따로 처리하므로 휠만 처리한다.
                if (self.previewEnabled) {
                    var el = document.querySelector(this.rmde_editor);
                    var clientBottom = $(this.rmde_editor).offset().top + $(this.rmde_editor).height();
                    var docBottom = self.mainEditor.documentTop + self.mainEditor.contentHeight;
                    // 첫 행에 이르면 preview도 첫 행으로 보낸다.
                    if(self.mainEditor.documentTop + self.mainEditor.defaultLineHeight > $(this.rmde_editor).offset().top) self.movePreviewPosition(-2);
                    // 마지막 행에 이르면 preview도 맨 끝으로 보낸다.
                    if(docBottom < clientBottom + self.mainEditor.defaultLineHeight) self.movePreviewPosition(-1);
                }
            }, {passive: true}
        ); 

        // 마우스 이동시 위치를 기억했다가 스크롤 시 참조한다.
        document.querySelector(this.rmde_editor).addEventListener("mousemove", function (e) {
            self.mousepagex = e.pageX;
            self.mousepagey = e.pageY;
        });

    }

    // 이벤트처리기에서 호출할 임시저장 루틴
    contentSave (self) {
        var selfthis = document.querySelector(".iText");
        // 임시저장 이외에 일반저장도 구현하려면 modules/document/document.controller.php를 수정해야 한다.
        var content_key = self.content_key;
        var insert_form = $(selfthis).closest("form");
        // 지금까지 편집된 내용을 종합해 form의 input 태그로 내용을 옮겨준다.
        var content_input = insert_form
            .find("input,textarea")
            .filter("[name=" + content_key + "]");
        var save_content = self.getHtmlData();
        content_input.val(save_content);
        if(typeof doDocumentSavePermanent !== "undefined") {
            doDocumentSavePermanent(selfthis);
            $(self.rmde_editor_notification).text("Document transferred.");
            $(self.rmde_editor_notification).css({ 'opacity': 1, 'visibility': 'visible'});
            $(self.rmde_editor_notification).animate({ opacity: 0, 'visibility': 'hidden'}, 1000);
        } else doDocumentSave(selfthis);
        self.autosaveTimer = null;
    }

    // 현재 커서 위치가 마지막 행인지 판별한다.
    isCursorOnLastRow(self) {
        // 일단 비어있는 경우 마지막 행이 맞고..
        if(self.mainEditor.state.doc.length === 0) return true;

        // 아닐 경우 커서의 위치를 구한 뒤
        var selection = self.mainEditor.state.selection;
        //var curFrom = selection.main.from;
        var curTo = selection.main.to;
        // 커서의 바로 뒤글자가 없으면 마지막 행인 것이고
        if(curTo === self.mainEditor.state.doc.length) return true;

        // 바로 뒤글자가 있으면 뒤글자의 bottom을 구해 문서 전체길이와 글자높이 이상 차이가 안나면 마지막 행
        var coordsPos = self.mainEditor.coordsAtPos(curTo, 1);
        if(coordsPos.bottom + self.mainEditor.defaultLineHeight > self.mainEditor.contentHeight) return true;
        else return false;
    }

    // 현재 커서 위치로 preview를 스크롤한다.
    scrollPreviewAsTextareaCursor(self) {
        // TODO: 커서위치가 없을 경우 대비도 해야 한다.
        var selection = self.mainEditor.state.selection;
        if (typeof selection === 'undefined') return false;
        //var curFrom = selection.main.from;
        var curTo = selection.main.to;
        console.log(curTo, self.mainEditor.state.doc.lineAt(curTo).number - 1)

        if(curTo === 0) self.movePreviewPosition(-2, false);
        else if(curTo === self.mainEditor.state.doc.length) self.movePreviewPosition(-1, false);
        //if(self.isCursorOnLastRow(self)) self.movePreviewPosition(-1, false);
        else self.movePreviewPositionByLineNo(self.mainEditor.state.doc.lineAt(curTo).number - 1, self);
        return true;
    }

    // 지정된 좌표에서의 행(0-based)을 구한다.
    getRowFromCoords(pageX, pageY, self) {
        var pos = self.mainEditor.posAtCoords({x: pageX, y: pageY}, false);
        return self.mainEditor.state.doc.lineAt(pos).number - 1;
    }

    onDocumentChanged() {
        var self = this;
        if (self.previewEnabled) {
            self.onPasteInput = true;// 스크롤 이벤트가 처리되지 않고 키에서 스크롤 하도록... 
            // 여러 번 호출되면 시스템 부하도 많이 생기고 이상동작할 수 있으므로 타이머를 걸어서 간격을 두어 처리한다.
            if(self.previewTimer != null) clearTimeout(self.previewTimer);
            self.previewTimer = setTimeout((self) => {
                self.renderMarkdownTextToPreview(self);
                //self.textareaCount.updateEditorSize();
                //self.textareaCount.setText($(self.rmde_editor).val());
                // 입력이 많을 때에는 지연되어 스크롤에 현상태가 잘 반영이 안된다. 
                // 그래서 스크롤이 여기에 맞추어 되도록 방법을 강구한다.
                self.scrollPreviewAsTextareaCursor(self);
                self.onPasteInput = false;// 스크롤 이벤트가 처리하지 않고 키에서 스크롤 하도록...
            }, 200, self);
        }

        // autosave가 설정되어 있으면 2초 뒤에 자동저장한다.
        if(self.autosaveFlag === true) {
            if(self.autosaveTime !== null) clearTimeout(self.autosaveTimer);
            self.autosaveTimer = setTimeout(self.contentSave, 2000, self);
        } 
    }

    onScroll(event, view, self) {
        // preview가 열려 있을 때만 조정한다.
        if (!self.onPasteInput && !self.arrowKeyDown // 키관련 스크롤은 따로 처리되도록..
            && self.previewEnabled ) { 
            self.movePreviewPositionByLineNo(self.getRowFromCoords(self.mousepagex, self.mousepagey, self), self);
        }
    }

    togglePreview() {
        let preview_display = $(this.rmde_preview).css("display");
        let preview_float = $(this.rmde_preview).css("float");

        let editor_height;

        if (preview_display == "none") {
            editor_height = this.totalHeight - 30;

            $(this.rmde_editor).css("width", "50%");
            $(this.rmde_editor).css("float", "left");
            $(this.rmde_editor).css("height", editor_height);
            $(this.rmde_editor).css("height", editor_height);

            $(this.rmde_preview).show();
            $(this.rmde_preview_title).hide();
            $(this.rmde_preview).css("width", "50%");
            $(this.rmde_preview).css("float", "right");
            $(this.rmde_preview).css("height", $(this.rmde_editor).css("height"));
            $(this.rmde_preview_main).css("height", $(this.rmde_editor).css("height"));

            $(this.rmde_root).css(
                "height",
                $(this.rmde_toolbar).height() + $(this.rmde_editor).height() + 3 // border에 따른 오차보정
                // box-sizing:border-box 시 border 계산에서 height() 함수와 css("height")는 다른 값을 출력할 수 있다.

            );

            this.renderMarkdownTextToPreview();
            this.previewEnabled = true;
        } else if (preview_display == "block" && preview_float == "right") {
            editor_height = (this.totalHeight - 60) / 2;

            $(this.rmde_editor).css("width", "100%");
            $(this.rmde_editor).css("float", "none");
            $(this.rmde_editor).css("height", editor_height);
            $(this.rmde_editor).css("height", editor_height);

            $(this.rmde_preview).show();
            $(this.rmde_preview_title).show();
            $(this.rmde_preview).css("width", "100%");
            $(this.rmde_preview).css("float", "none");
            $(this.rmde_preview).css("height", editor_height + 30);
            $(this.rmde_preview_main).css("height", $(this.rmde_editor).css("height"));
            //$(this.rmde_preview).css("height", $(this.rmde_editor).css("height"));
            $(this.rmde_root).css("height",
                $(this.rmde_toolbar).height() + $(this.rmde_editor).height() + $(this.rmde_preview).height() + 4 // border에 따른 오차보정
            );

            this.renderMarkdownTextToPreview();
            this.previewEnabled = true;
        } else {
            editor_height = this.totalHeight - 30;

            $(this.rmde_preview).hide();
            $(this.rmde_editor).css("height", editor_height);
            $(this.rmde_editor).css("height", editor_height);

            $(this.rmde_root).css("height",
                $(this.rmde_toolbar).height() + $(this.rmde_editor).height() + 3 // border에 따른 오차보정
            );

            this.previewEnabled = false;
        }
    }

    getDocumentYFromLineNo(textLineNo, self) {
        //console.log("getDocumentYFromLineNo", textLineNo)
        var lineInfo = self.mainEditor.state.doc.line(textLineNo + 1);
        var blockInfo = self.mainEditor.lineBlockAt(lineInfo.from);
        return blockInfo.top;
    }

    // 주어진 행은 preview상에는 등록되어 있지 않을 수 있어 실제로 preview에 행이 등록되어 있는 textarea상의 행을 찾는다.
    getEffectiveLineNo(textLineNo) {
        // 해당 textLineNo에 해당하는 preview HTML이 없으면 나올 때까지 textLineNo를 줄여가며 찾는다. 
        for (var effTextLineNo = textLineNo; 
            $(`[data-source-line="${effTextLineNo}"]`).offset() === undefined && effTextLineNo >= 0; 
            effTextLineNo--);//console.log(effTextLineNo, $(`[data-source-line="${effTextLineNo}"]`).offset());
        return effTextLineNo;
    }

    // 특정 행번호에 해당하는 preview HTML을 preview 상단으로 이동한다.
    movePreviewPositionByLineNo(textLineNo, self) {
        // 첫줄과 끝줄은 따로 처리한다.
        if(textLineNo === -2 || textLineNo === -1) self.movePreviewPosition(textLineNo);
        else {
            var effectiveTextLineNo = self.getEffectiveLineNo(textLineNo);
            //console.log("movePreviewPositionByLineNo", textLineNo, effectiveTextLineNo)
            // 앞 부분에 effectiveLineNo가 없으면 맨 앞으로 스크롤한다.
            if(effectiveTextLineNo == -1) self.movePreviewPosition(-2);
            else {
                // 해당 행이 위치하는 Y 좌표를 구해 거기서 에디터 상단 Y를 뺀 만큼이 스크롤량이다.
                var documentY = self.getDocumentYFromLineNo(effectiveTextLineNo, self);
                var scrollY = documentY + self.mainEditor.documentTop;
                var top = $(self.rmde_editor).offset().top;
                //console.log("movePreviewPositionByLineNo", textLineNo, effectiveTextLineNo, scrollY, top, scrollY-top);
                self.movePreviewPosition(effectiveTextLineNo, false, scrollY - top);
            }
        }
    }

    // 지정된 markdown 행번호에 해당하는 preview HTML을 preview 상단으로 이동한다.
    movePreviewPosition(
        linenum,
        animate = false,
        slideDown = 0 // 스크롤 미세조정을 위해 얼마나 더 내릴 것인가(덜 끌어올릴 것인가) 결정
    ) {
        //console.log("movePreviewPosition", linenum, animate, slideDown, $(this.rmde_preview_main).prop('scrollHeight'));

        // 끝줄로 가면 끝줄 처리를 한다.
        if (linenum == -1) {
            $(this.rmde_preview_main).stop(true).animate({ scrollTop: $(this.rmde_preview_main).prop('scrollHeight'), }, 100, "linear");
            return;
        }
        else if (linenum == -2) {
            $(this.rmde_preview_main).stop(true).animate({ scrollTop: 0, }, 100, "linear"); // 첫 줄 처리
            return;
        }

        // 해당 행에 맞는 preview 위치로 preview 텍스트를 옮긴다.
        let offset = $(`[data-source-line="${linenum}"]`).offset(); // document 상 위치
        // TODO: 정의되어 있지 않을 경우 화면전환시 엉뚱한 곳으로 가는 경우가 있어 보정이 필요하다.
        if (typeof offset === 'undefined') return;
        let distance = offset.top - $(this.rmde_preview_main).offset().top;

        // 첫번째 줄이 정의되어 있지 않다면 맨 앞으로 스크롤하고 그렇지 않으면 적절히 계산해서 스크롤한다.
        let scrollval = // 첫 행을 document 기준 어느 Y좌표까지 끌어올릴지
            $(this.rmde_preview_main).scrollTop() // 지금 스크롤된 분량을 초기화하는 분량
            + distance // 현재 목적행을 화면 맨 위로 옮기기 위해 끌어올릴 분량
            - slideDown; // 끌어내릴 분량
        //console.log("scroll", scrollval, distance, slideDown);
        if (scrollval < 0) scrollval = 0;

        $(this.rmde_preview_main).stop(true).animate({ scrollTop: scrollval, }, 100, "linear");

        // 선택 부위를 하이라이트한다.
        if (animate) {
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 0.4, }, 400);
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 1.0, }, 400);
        }
    }

    encodeReplacer(match, p1, p2, p3, p4, p5, p6, p7, p8, p9, pa, pb, pc, pd, offset, string) {
        // replaces '<' into '< ' not to make this into html tags.
        // encodeURIComponent에서 변환하지 않는 -_.!~\*\(\)'도 변환한다.(그러지 않으면 markdown-it이 변환해버림)
        return "\\\\\[" + encodeURIComponent(match.replace("<", "&lt;")).replace(/([-_.!~\*\(\)']+)/gm, 
            function(match, p1, offset, string) {
                var ret_str = "";
                for(var i = 0; i < match.length; i++)
                    ret_str += "%" + match.charCodeAt(i).toString(16);
                return ret_str;
            }).replace(/%0A/gm, "\n") + "\\\\\]"; // 줄바꿈은 변환하지 않아 줄 수 셀 때 오차가 없도록 한다.
    };

    decodeReplacer(match, p1, p2, p3, offset, string) {
        return decodeURIComponent(p2);

    };

    // 마크다운을 변환한다.
    convertMarkdownToHtml(self, markdownText) {
        if (typeof self.md === "undefined") 
        {
            // MathJax 모듈을 로딩한다.
            self.md = MarkdownIt({
                html: true,
                breaks: true,
                linkify: true,
                typographer: true,
            }).use(mdiFootNote)
            .use(mdiAbbr)
            .use(mdiMark)
            .use(mdiImsize)
            .use(mdiDeflist)
            .use(markdown_it_inject_linenumbers);
        }

        if (typeof MathJax !== "undefined") 
        {       
            // ?는 non=greedy하게 잡기 위해 /gm은 여러줄에서 모든 매칭을 잡기 위해
            let escapedMarkdownText = markdownText.replace(
                /(\\\$)|(\\\[)([\w\W]+?)(\\\])|(\\\()([\w\W]+?)(\\\))|(\$\$)([\w\W]+?)(\$\$)|(\$)([\w\W]+?)(\$)/gm, this.encodeReplacer);
            let convertedText = HtmlSanitizer.SanitizeHtml(self.md.render(escapedMarkdownText));
            let unescapedLatexHtml = convertedText.replace(/(\\\[)([\w\W]+?)(\\\])/gm, this.decodeReplacer);

            return unescapedLatexHtml;
        }
        else return HtmlSanitizer.SanitizeHtml(self.md.render(markdownText));
    }

    // MathJax를 포함한 마크다운을 변환한다.
    renderMarkdownTextToPreview(self = null) {
        if(self == null) self = this;

        // 변환한다.
        let convertedHTMLText = self.convertMarkdownToHtml(self, self.getMarkdownText());
        let elem = document.querySelector(self.rmde_preview_main);

        // 이전과 비교하여 바뀐 부분만 반영되도록 한다.
        diff.changeDiff(diff.stringToHTML(convertedHTMLText), elem);
        if (typeof MathJax !== "undefined" && typeof MathJax.typeset !== "undefined") {
            //console.log("typeset")
            MathJax.texReset();
            MathJax.typesetPromise([elem]).then(()=>{})//console.log("done typeset")})
            .catch((err)=>{console.log(err.message)});
        }
        self.previewTimer = null;
    }

    divideIntoMarkdownAndHtml(content) {
        // 보안을 위해 HTML 파싱없이 아래와 같은 형태로 된 코드가 마지막 element로 있어야만 마크다운 텍스트로 인정한다.
        // 정규표현식 쓰기가 귀찮아서 그냥 아래 코드를 바로 검색했다. 추후 유연성을 두어도 될 듯하다.
        // "<code id='RhymixMarkdownEditor-MarkdownText' style='display:none'>[Markdown text]</code>"
        // 맨 앞으로 두면 첫번째 노드 설정을 해 둔 경우 문제가 발생한다. 그래서 맨 뒤로 두었다.
        let md_start = content.lastIndexOf(this.bottom_tag_head);
        let md_end = content.lastIndexOf(this.bottom_tag_tail);
        let markdown_text = null;
        let html_text = null;
        if (md_start >= 0
            && md_end + this.bottom_tag_tail.length === content.length
            && md_end > md_start + this.bottom_tag_head.length) {
            html_text = content.substr(0, md_start);
            markdown_text = content.slice(md_start + this.bottom_tag_head.length, md_end);
        } else {
            markdown_text = null;
            html_text = content;
        }

        // Markdown 데이터가 없으면 turndown으로 변환해서 rmde_editor에 넣어준다.
        if (markdown_text === null) {
            // Markdown 텍스트가 없으면 Turndown을 사용한다.
            let turndownService = new TurndownService();
            let markdown_text_turndown = turndownService.turndown(html_text);
            var update = this.mainEditor.state.update({
                changes: {from: 0, to: this.mainEditor.state.doc.length, insert: markdown_text_turndown}});
            this.mainEditor.update(([update]));

            // Preview에 상부에서 받은 html 데이터를 넣어준다.
            $(this.rmde_preview_main).html(html_text);
        } else {
            // Markdown 데이터가 있으면 mainEditor에도 넣어주고
            var update = this.mainEditor.state.update({
                changes: {from: 0, to: this.mainEditor.state.doc.length, insert: decodeURI(markdown_text.replace(/%24/gm, "$"))}}); // MathJax가 무단으로 변환하는 것을 방지
            this.mainEditor.update(([update]));
            //console.log(decodeURI(markdown_text))

            // Preview에 상부에서 받은 html 데이터를 넣어주고
            $(this.rmde_preview_main).html(html_text);
        }
    }


    //// Interface functions below ////

    // Get mixed html data which contains markdown text and corresponding html text
    getHtmlData() {
        //var content_html = this.getHtmlText();
        var markdownText = this.getMarkdownText();
        //console.log("markdown", markdownText)
        var content_md = encodeURI(markdownText).replace(/\$/gm, "%24"); // MathJax가 무단으로 변환하는 것을 방지
        //console.log("content_md", content_md)
        var content_html = this.convertMarkdownToHtml(this, markdownText);
        return content_html + this.bottom_tag_head + content_md + this.bottom_tag_tail;
    }

    // DB에서 가져온 HTML을 preview에 넣어주고 그 중 앞부분에 숨긴 markdown text를 추출해서 에디터에 넣어준다.
    // 만약숨긴 markdown text가 없으면 turndown 서비스를 이용해 전환해준다.
    putHtmlData(html) {
        // html 원데이터에서 마크다운과 HTML을 각각 textarea와 preview에 넣어준다.
        this.divideIntoMarkdownAndHtml(html);

        if(this.previewEnabled) this.renderMarkdownTextToPreview();
    }

    // Get whole HTML text from the editor
    getHtmlText() {
        return $(this.rmde_preview_main).html();
    }

    // Get whole markdown text from the editor
    getMarkdownText() {
        return this.mainEditor.state.doc.toString();
    }

    // Insert markdown text into the editor at current cursor position
    insertMarkdownText(markdownText) {
        // 현재 커서 위치에 덮어쓰기를 한다.
        var selection = this.mainEditor.state.selection;
        var curFrom = selection.main.from;
        var curTo = selection.main.to;
        var update = this.mainEditor.state.update({
             changes: {from: curFrom, to: curTo, insert: markdownText}});
        this.mainEditor.update(([update]));

        if(this.previewEnabled) this.renderMarkdownTextToPreview();
    }

    setHeight(height) {
        $(this.rmde_root).css("height", height);

        this.totalHeight = $(this.rmde_root).height();
        let editorHeight = this.totalHeight - 30;

        $(this.rmde_editor).css("height", editorHeight);
        $(this.rmde_editor).css("height", editorHeight);
    }

    getHeight() {
        return this.totalHeight;
    }
}

export default RhymixMarkdownEditor;