/**
 * @author seainthebottle <seainthebottle@gmail.com>
 */

import $ from "jquery";
import MarkdownIt from "markdown-it";
import mdiFootNote_ from "markdown-it-footnote";
import mdiAbbr_ from "markdown-it-abbr";
import mdiMark_ from "markdown-it-mark";
import mdiImsize_ from "markdown-it-imsize";
import mdiDeflist_ from "markdown-it-deflist";
import mdiTasks_ from "markdown-it-tasks";
import mdiSup_ from "markdown-it-sup";
import mdiSub_ from "markdown-it-sub";
import mdiEmoji_ from "markdown-it-emoji";
import TurndownService from "turndown";
import markdown_it_inject_linenumbers from "./lib/markdown-it-inject-linenumbers";
import rmdePreview from "./lib/rmde-preview";

import {markdown} from "@codemirror/lang-markdown";
import {GFM, Superscript, Subscript, Emoji} from "@lezer/markdown";
import {rmdeLight, rmdeHighlightStyleLight} from "./lib/theme-rmde-light";
import {rmdeDark, rmdeHighlightStyleDark} from "./lib/theme-rmde-dark";
import {mdpTexInline, mdpTexBlock, mdpMark, mdpReferenceText} from "./lib/additional-markdown-parser";
import {EditorView, keymap, drawSelection, highlightActiveLine, dropCursor,
    rectangularSelection, crosshairCursor,
    lineNumbers, highlightActiveLineGutter} from "@codemirror/view"
import {Extension, Compartment, StateEffect, EditorState} from "@codemirror/state"
import {defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldKeymap} from "@codemirror/language"
import {defaultKeymap, history, historyKeymap} from "@codemirror/commands"
import {searchKeymap, highlightSelectionMatches} from "@codemirror/search"
import {autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap} from "@codemirror/autocomplete"
import {lintKeymap} from "@codemirror/lint"

export const mdiFootNote = mdiFootNote_;
export const mdiAbbr = mdiAbbr_;
export const mdiMark = mdiMark_;
export const mdiImsize = mdiImsize_;
export const mdiDeflist = mdiDeflist_;
export const mdiTasks = mdiTasks_;
export const mdiSup = mdiSup_;
export const mdiSub = mdiSub_;
export const mdiEmoji = mdiEmoji_;

/**
 * 메인클래스
 */
class RhymixMarkdownEditor {
    constructor(editor_id) {
        this.previewEnabled = false;
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

        // MathJax 모듈을 로딩한다.
        if(typeof EditorSettings === 'undefined') window.EditorSettings = {}; 
        this.md = MarkdownIt({
            html: true,
            breaks: true,
            linkify: true,
            typographer: true,
            html: (EditorSettings.html ?? false), 
            xhtmlOut: (EditorSettings.xhtmlOut ?? false), 
            breaks: (EditorSettings.breaks ?? false), 
            linkify: (EditorSettings.linkify ?? false), 
            typographer: (EditorSettings.typographer ?? false)
        }).use(mdiFootNote)
        .use(mdiAbbr)
        .use(mdiMark)
        .use(mdiImsize)
        .use(mdiDeflist)
        .use(mdiTasks, { enabled: true })
        .use(mdiSup)
        .use(mdiSub)
        .use(mdiEmoji)
        .use(markdown_it_inject_linenumbers);

        this.rmdePreview = new rmdePreview();
    }

    /**
     * HTML 골조를 만들고 이벤트 처리기를 달아준다.
     * @param {*} content_key - 라이믹스에서 부여받은 내용의 고유 키
     * @param {*} content_text - 에디터에 넣을 초기 Markdown text
     */
    build(content_key, content_text) {
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

        //////////////// 에디터를 생성한다. ////////////////

        const baseFont = EditorView.theme({
            ".cm-content": { 
                fontSize: $(this.rmde_editor).css('font-size'),
                fontFamily: $(this.rmde_editor).css('font-family')
            }
        });

        var themeCompartment = new Compartment();
        
        // var darkTheme = lightTheme = [];
        // if(typeof EditorSettings != 'undefined'){
        //     if(typeof EditorSettings.themeLight != 'undefined') {
        //         lightTheme = [EditorView.theme(EditorSettings.themeLight), syntaxHighlighting(rmdeHighlightStyleLight)];
        //     } else lightTheme = rmdeLight;
        //     if(typeof EditorSettings.themeDark != 'undefined') {
        //         darkTheme = [EditorView.theme(EditorSettings.themeDark), syntaxHighlighting(rmdeHighlightStyleDark)];
        //     } else darkTheme = rmdeDark;
        // }

        var baseTheme = rmdeLight;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
            baseTheme = rmdeDark;

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
                baseFont,
                themeCompartment.of(baseTheme),
                fixedHeightEditor,
                EditorView.lineWrapping,
                (typeof MathJax !== "undefined") ? 
                    markdown({extensions: [...GFM, Superscript, Subscript, Emoji, mdpTexInline, mdpTexBlock, mdpMark, mdpReferenceText] }):
                    markdown({extensions: [...GFM, Superscript, Subscript, Emoji, mdpMark, mdpReferenceText] }),
                eventHandler,
                domeventhandler,
                lineNumbers(),
                //highlightActiveLineGutter(),
                history(),
                //drawSelection(),
                dropCursor(),
                EditorState.allowMultipleSelections.of(true),
                indentOnInput(),
                syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                rectangularSelection(),
                crosshairCursor(),
                highlightActiveLine(),
                highlightSelectionMatches(),
                keymap.of([
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...searchKeymap,
                    ...historyKeymap,
                    ...foldKeymap,
                    ...completionKeymap,
                    ...lintKeymap
                ])
            ],
            doc: content_text
        });
          
        this.mainEditor = new EditorView({
            state,
            parent: document.querySelector(this.rmde_editor) 
        });

        this.docuClientTop = this.mainEditor.documentTop; // 줄에 걸친 행을 구할 때 사용


        // 자동저장이 지정되어 있으면 표시한다.
        if(typeof EditorSettings != 'undefined' &&
            typeof EditorSettings.autosave !== 'undefined' && 
            EditorSettings.autosave)
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
            return rownum;
        }

        // Preview 버튼이 눌러진 경우
        $(this.rmde_btn_preview).on("click", function () {
            self.rmdePreview.togglePreview(self);
            if (self.previewEnabled) {
                // 에디터 화면 맨 위에 걸린 텍스트에 맞추어 preview를 스크롤한다.
                self.rmdePreview.movePreviewPositionByLineNo(getFirstVisibleRow(self), self);
            }
        });

        //// 각종 키 처리를 해 준다. ////
        $(window).on("keydown", function (e) {
            let keyCode = e.key || e.keyCode;
            // Alt+`의 경우 preview를 토글한다.
            if (keyCode === "`" && e.altKey) {
                self.rmdePreview.togglePreview(self);
                // preview 직후에 미처 에디터가 다 전환되지 않은 상태에서 리턴되므로
                // 조금 여유를 두고 preview를 스크롤한다. (TODO: 나중에 아예 확실한 대책 마련 필요)
                if (self.previewEnabled) {
                    // 단축키로 전환시에는 대개 커서 위치에 작업중인 경우가 많아 preview를 커서 쪽으로 맞추는 것이 좋다.
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
                    if(self.mainEditor.documentTop + self.mainEditor.defaultLineHeight > $(this.rmde_editor).offset().top) self.rmdePreview.movePreviewPosition(self, -2);
                    // 마지막 행에 이르면 preview도 맨 끝으로 보낸다.
                    if(docBottom < clientBottom + self.mainEditor.defaultLineHeight) self.rmdePreview.movePreviewPosition(self, -1);
                }
            }, {passive: true}
        ); 

        // 마우스 이동시 위치를 기억했다가 스크롤 시 참조한다.
        document.querySelector(this.rmde_editor).addEventListener("mousemove", function (e) {
            self.mousepagex = e.pageX;
            self.mousepagey = e.pageY;
            var pos = self.mainEditor.posAtCoords({x: self.mousepagex, y: self.mousepagey}, false);
        });

        // dark/light 모드에 따라 자동으로 바뀔 수 있도록 해 준다.
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
            var newTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)?rmdeDark:rmdeLight;
            self.mainEditor.dispatch({effects: [themeCompartment.reconfigure([newTheme])]});
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

        if(curTo === 0) self.rmdePreview.movePreviewPosition(self, -2, false);
        else if(curTo === self.mainEditor.state.doc.length) self.rmdePreview.movePreviewPosition(self, -1, false);
        else self.rmdePreview.movePreviewPositionByLineNo(self.mainEditor.state.doc.lineAt(curTo).number - 1, self);
        return true;
    }

    // 지정된 좌표에서의 행(0-based)을 구한다.
    getRowFromCoords(pageX, pageY, self) {
        var pos = self.mainEditor.posAtCoords({x: pageX, y: pageY}, false); // 화면의 스크롤을 감안해야 한다.
        return self.mainEditor.state.doc.lineAt(pos).number - 1;
    }

    onDocumentChanged() {
        var self = this;
        if (self.previewEnabled) {
            self.onPasteInput = true;// 스크롤 이벤트가 처리되지 않고 키에서 스크롤 하도록... 
            // 여러 번 호출되면 시스템 부하도 많이 생기고 이상동작할 수 있으므로 타이머를 걸어서 간격을 두어 처리한다.
            if(self.previewTimer != null) clearTimeout(self.previewTimer);
            self.previewTimer = setTimeout((self) => {
                self.rmdePreview.renderMarkdownTextToPreview(self);
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
            self.rmdePreview.movePreviewPositionByLineNo(self.getRowFromCoords(self.mousepagex, self.mousepagey - $(document).scrollTop(), self), self);
        }
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
        return {markdown: markdown_text, html: html_text};
    }

    injectMarkdownAndHtml(markdown_text, html_text) {
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
                changes: {from: 0, to: this.mainEditor.state.doc.length, insert: decodeURI(markdown_text)}});
            this.mainEditor.update(([update]));

            // Preview에 상부에서 받은 html 데이터를 넣어주고
            $(this.rmde_preview_main).html(html_text);
        }
    }


    //// Interface functions below ////

    // Get mixed html data which contains markdown text and corresponding html text
    getHtmlData() {
        var markdownText = this.getMarkdownText();
        var content_md = encodeURI(markdownText);
        var content_html = this.rmdePreview.convertMarkdownToHtml(this, markdownText);
        return content_html + this.bottom_tag_head + content_md + this.bottom_tag_tail;
    }

    // DB에서 가져온 HTML을 preview에 넣어주고 그 중 앞부분에 숨긴 markdown text를 추출해서 에디터에 넣어준다.
    // 만약숨긴 markdown text가 없으면 turndown 서비스를 이용해 전환해준다.
    putHtmlData(html) {
        // html 원데이터에서 마크다운과 HTML을 각각 textarea와 preview에 넣어준다.
        var divided = this.divideIntoMarkdownAndHtml(html);
        this.injectMarkdownAndHtml(divided.markdown, divided.html);

        if(this.previewEnabled) this.rmdePreview.renderMarkdownTextToPreview(this);
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

        if(this.previewEnabled) this.rmdePreview.renderMarkdownTextToPreview(this);
    }

    setHeight(height) {
        $(this.rmde_root).css("height", height);

        let editorHeight = $(this.rmde_root).height() - 30;

        $(this.rmde_editor).css("height", editorHeight);
        $(this.rmde_editor).css("height", editorHeight);
    }

    getHeight() {
        return $(this.rmde_root).height();
    }
}

export default RhymixMarkdownEditor;