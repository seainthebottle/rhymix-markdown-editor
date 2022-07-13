import $ from "jquery";
import MarkdownIt from "markdown-it";
import mdiFootNote_ from "markdown-it-footnote";
import mdiAbbr_ from "markdown-it-abbr";
import mdiMark_ from "markdown-it-mark";
import mdiImsize_ from "markdown-it-imsize";
import mdiMathjax_ from "markdown-it-mathjax";
import TurndownService from "turndown";
import HtmlSanitizer from "./lib/htmlSanitizer";
import diff from "./lib/changeDiff";
import markdown_it_inject_linenumbers from "./lib/markdown-it-inject-linenumbers";
import TextareaCount from "./lib/textareacount";

export const mdiFootNote = mdiFootNote_;
export const mdiAbbr = mdiAbbr_;
export const mdiMark = mdiMark_;
export const mdiImsize = mdiImsize_;
export const mdiMathjax = mdiMathjax_;

class RhymixMarkdownEditor {
    constructor(editor_id) {
        this.previewEnabled = false;
        this.totalHeight = 600;
        this.resizeTimer = null;
        this.previewTimer = null;

        this.bottom_tag_head = "<code id='RhymixMarkdownEditor-MarkdownText' style='display:none'>";
        this.bottom_tag_tail = "</code>";
        
        this.id = editor_id;
        this.rmde_root = editor_id + " .rmde_class_root";
        this.rmde_toolbar = editor_id + " .rmde_toolbar";
        this.rmde_btn_preview = editor_id + " .rmde_btn_preview";
        this.rmde_editor = editor_id + " .rmde_editor";
        this.rmde_editor_ruler_for_scroll = editor_id + " #rmde_editor_ruler_for_scroll";
        this.rmde_editor_textarea = editor_id + " #rmde_editor_textarea";
        this.rmde_preview = editor_id + " .rmde_preview";
        this.rmde_preview_title = editor_id + " .rmde_preview_title";
        this.rmde_preview_main = editor_id + " .rmde_preview_main";
        this.rmde_status_mathjax_on = editor_id + " #rmde_status_mathjax_on";

    }

    // HTML 골조를 만들고 이벤트 처리기를 달아준다.
    build(content_key) {
        this.content_key = content_key;

        // MathJax 모듈을 로딩한다.
        this.md = MarkdownIt({
            html: true,
            breaks: true,
            linkify: true,
            typographer: true,
        }).use(mdiFootNote)
        .use(mdiAbbr)
        .use(mdiMark)
        .use(mdiImsize)
        .use(markdown_it_inject_linenumbers);

        // MathJax가 로딩되어 있는 경우 MathJax 모듈도 넣는다.
        if (typeof MathJax !== "undefined") this.md.use(mdiMathjax);

        let html_data = '\
        <div class="rmde_class_root">\
            <div class="rmde_toolbar">\
                <ul>\
                    <li><button type="button" class="rmde_btn_preview">Preview</button></li>\
                    <li id="rmde_status_mathjax_on" class="rmde_status_indicator">MathJax ON</li>\
                </ul>\
            </div>\
            <div class="rmde_editor">\
                <div id="rmde_editor_ruler_for_scroll" class="rmde_editor_textarea" style="position:absolute;">\
                </div>\
                <textarea id="rmde_editor_textarea" class="rmde_editor_textarea"></textarea>\
            </div>\
            <div class="rmde_preview">\
                <div class="rmde_preview_title">Preview screen</div>\
                <div class="rmde_preview_main rhymix_content"></div>\
            </div>\
        </div>';
        // .rmde_class_root에 위의 html을 삽입한다.
        $(this.id).html(html_data);
        // 초기에 preview는 숨긴다.
        $(this.rmde_preview).hide();
        // MathJax가 로딩되어 있으면 표시한다.
        if (typeof MathJax !== "undefined")
            $(this.rmde_status_mathjax_on).css("display", "inline-block");
        else
            $(this.rmde_status_mathjax_on).css("display", "none");

        ///////////////////////////////////////////////////////////////////////
        // 이벤트 처리를 해 준다.
        let self = this;

        // Preview 버튼이 눌러진 경우
        $(this.rmde_btn_preview).on("click", function () {
            self.togglePreview();
            if (self.previewEnabled) {
                self.textareaCount.updateEditorSize();
                self.textareaCount.setText($(self.rmde_editor_textarea).val());
                var textLineNo = self.getEffectiveLineNo(self.textareaCount.getLineCountByScrollY(
                    $(self.rmde_editor_textarea).scrollTop()));
                var scrollY = self.textareaCount.getScrollYbyLineCount(textLineNo);
                self.movePreviewPosition(textLineNo, false, scrollY - $(self.rmde_editor_textarea).scrollTop());
               // console.log("preview clicked", textLineNo, effTextLineNo, scrollY, scrollY - $(self.rmde_editor_textarea).scrollTop());
            }
        });

        // 편집창에서 마우스 클릭될 때 preview 위치도 조정해준다.
        $(this.rmde_editor_textarea).on("click", function (e) {
            // preview가 열려 있을 때만 조정한다.
            if (self.previewEnabled) {
                var textLineNo = self.getEffectiveLineNo(self.textareaCount.getLineCountByScrollY(
                    $(self.rmde_editor_textarea).scrollTop() + e.pageY - $(self.rmde_editor_textarea).offset().top));
                var scrollY = self.textareaCount.getScrollYbyLineCount(textLineNo);
                //console.log("current line(click)", textLineNo, $(self.rmde_editor_textarea).scrollTop(), $(self.rmde_editor_textarea).offset().top, e.pageY, scrollY);
                self.movePreviewPosition(textLineNo, false, scrollY - $(self.rmde_editor_textarea).scrollTop());
            }
        });

        // 내용 수정이 되면 업데이트해준다.
        //$(code).bind("keyup mouseup", function () {
        $(this.rmde_editor_textarea).on("input paste", function () {
            if (self.previewEnabled)
                self.renderMarkdownTextToPreview();
            self.textareaCount.updateEditorSize();
            self.textareaCount.setText($(self.rmde_editor_textarea).val());
        });

        //// 각종 키 처리를 해 준다. ////
        $(window).on("keydown", function (e) {
            let keyCode = e.key || e.keyCode;
            // Alt+`의 경우 preview를 토글한다.
            if (keyCode === "`" && e.altKey) {
                self.togglePreview();
                if (self.previewEnabled) {
                    self.textareaCount.updateEditorSize();
                    self.textareaCount.setText($(self.rmde_editor_textarea).val());
                    var textLineNo = self.getEffectiveLineNo(self.textareaCount.getLineCountByScrollY(
                        $(self.rmde_editor_textarea).scrollTop()));
                    var scrollY = self.textareaCount.getScrollYbyLineCount(textLineNo);
                    self.movePreviewPosition(textLineNo, false, scrollY - $(self.rmde_editor_textarea).scrollTop());
                }
            }
        });

        // Textarea 전용
        $(this.rmde_editor_textarea).on("keydown", function (e) {
            let keyCode = e.key || e.keyCode;
            // 탭키가 눌러지면 편집창을 벗어나지 않고 탭을 넣을 수 있도록 해 준다.
            if (keyCode === "Tab") {
                var element = document.querySelector(self.rmde_editor_textarea);
                document.execCommand('insertText', false, "\t");

                return false;
            }

            // Ctrl+s의 경우 임시저장한다.
            else if (keyCode === "s" && e.ctrlKey) {
                e.preventDefault();
                // 임시저장 이외에 일반저장도 구현하려면 modules/document/document.controller.php를 수정해야 한다.
                var content_key = self.content_key;
                var insert_form = $(this).closest("form");
                // 지금까지 편집된 내용을 종합해 form의 input 태그로 내용을 옮겨준다.
                var content_input = insert_form
                    .find("input,textarea")
                    .filter("[name=" + content_key + "]");
                // preview로 markdown 변환된 내용을 반영해 주고
                self.renderMarkdownTextToPreview();
                var save_content = self.getHtmlData();
                content_input.val(save_content);
                doDocumentSave(this);
            }
        });

        // 에디터를 스크롤 할때 preview도 스크롤해준다.
        $(this.rmde_editor_textarea).on("scroll", function (e) {
            // preview가 열려 있을 때만 조정한다.
            if (self.previewEnabled) {
                var textLineNo = self.textareaCount.getLineCountByScrollY(
                        $(self.rmde_editor_textarea).scrollTop());
                var scrollY = self.textareaCount.getScrollYbyLineCount(textLineNo);
                var clientHeight = document.querySelector(self.rmde_editor_textarea).clientHeight;
                var scrollHeight = $(self.rmde_editor_textarea).prop('scrollHeight');
                if (clientHeight + $(self.rmde_editor_textarea).scrollTop() >= scrollHeight) {
                    self.movePreviewPosition(-1, false, scrollY - $(self.rmde_editor_textarea).scrollTop());
                }
                else
                    self.movePreviewPosition(textLineNo, false, scrollY - $(self.rmde_editor_textarea).scrollTop());
            }
        });

        // 에디터 크기가 변하면 TextareCount도 재설정해야한다.
        $(window).on("resize", function (e) {
            clearTimeout(self.resizeTimer);
            self.resizeTimer = setTimeout(function () {
                //console.log("onresize textarea");
                self.textareaCount.updateEditorSize();
                self.textareaCount.setText($(self.rmde_editor_textarea).val());
            }, 300);

        });
    }

    getEffectiveLineNo(textLineNo) {
        // 해당 textLineNo에 해당하는 preview HTML이 없으면 나올 때까지 textLineNo를 줄여가며 찾는다. 
        for (var effTextLineNo = textLineNo; 
            $(`[data-source-line="${effTextLineNo}"]`).offset() === undefined && effTextLineNo > 0; 
            effTextLineNo--);//console.log(effTextLineNo, $(`[data-source-line="${effTextLineNo}"]`).offset());
        return effTextLineNo;
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
            $(this.rmde_editor_textarea).css("height", editor_height);
            $(this.rmde_preview).show();
            $(this.rmde_preview_title).hide();
            $(this.rmde_preview).css("width", "50%");
            $(this.rmde_preview).css("float", "right");
            $(this.rmde_preview).css("height", $(this.rmde_editor).css("height"));
            $(this.rmde_preview_main).css("height", $(this.rmde_editor_textarea).css("height"));

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
            $(this.rmde_editor_textarea).css("height", editor_height);
            $(this.rmde_preview).show();
            $(this.rmde_preview_title).show();
            $(this.rmde_preview).css("width", "100%");
            $(this.rmde_preview).css("float", "none");
            $(this.rmde_preview).css("height", editor_height + 30);
            $(this.rmde_preview_main).css("height", $(this.rmde_editor_textarea).css("height"));
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
            $(this.rmde_editor_textarea).css("height", editor_height);

            $(this.rmde_root).css("height",
                $(this.rmde_toolbar).height() + $(this.rmde_editor).height() + 3 // border에 따른 오차보정
            );

            this.previewEnabled = false;
        }
    }

    // 지정된 markdown 행번호에 해당하는 preview HTML을 preview 상단으로 이동한다
    movePreviewPosition(
        linenum,
        animate = true,
        slideDown = 0 // 스크롤 미세조정을 위해 얼마나 더 내릴 것인가(덜 끌어올릴 것인가) 결정
    ) {
        //console.log("movePreviewPosition", linenum, animate, slideDown);

        if (linenum == -1) {
            $(this.rmde_preview_main).stop(true).animate({ scrollTop: $(this.rmde_preview_main).prop('scrollHeight'), }, 100, "linear");
            return;
        }

        // 해당 행에 맞는 preview 위치로 preview 텍스트를 옮긴다.
        let offset = $(`[data-source-line="${linenum}"]`).offset();
        // TODO: 정의되어 있지 않을 경우 화면전환시 엉뚱한 곳으로 가는 경우가 있어 보정이 필요하다.
        if (offset == undefined)
            return;

        // 첫번째 줄이 정의되어 있지 않다면 맨 앞으로 스크롤하고 그렇지 않으면 적절히 계산해서 스크롤한다.
        let scrollval = typeof offset !== "undefined"
            ? offset.top + ($(this.rmde_preview_main).scrollTop() - $(this.rmde_preview_main).offset().top) - slideDown
            : 0;
        if (scrollval < 0)
            scrollval = 0;

        if (linenum == 0)
            $(this.rmde_preview_main).stop(true).animate({ scrollTop: 0, }, 100, "linear");
        else
            $(this.rmde_preview_main).stop(true).animate({ scrollTop: scrollval, }, 100, "linear");

        // 선택 부위를 하이라이트한다.
        if (animate) {
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 0.4, }, 400);
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 1.0, }, 400);
        }
    }

    // render current markdown text to preview window as html format
    renderMarkdownTextToPreview() {
        // Promise를 사용해 호출하고 기다리지 않도록 한다.
        // 또한 여러 번 호출되면 시스템 부하도 많이 생기고 이상동작할 수 있으므로 타이머를 걸어서 간격을 두어 처리한다.
        let self = this;
        clearTimeout(self.previewTimer);
        self.previewTimer = setTimeout(function () {

            // MathJax가 로딩되어 있는 경우 LaTex 구문을 escape한다.
            if (typeof MathJax !== "undefined") {
                // 변환한다.
                let escapedMarkdownText = self.getMarkdownText().split('\\$').join("Umh5bWl4TWFya2Rvd24=");
                let convertedText = HtmlSanitizer.SanitizeHtml(self.md.render(escapedMarkdownText));
                let unescapedLatexHtml = convertedText.split("Umh5bWl4TWFya2Rvd24=").join('\\$');

                // 이전과 비교하여 바뀐 부분만 반영되도록 한다.
                diff.changeDiff(
                    diff.stringToHTML(unescapedLatexHtml),
                    document.querySelector(self.rmde_preview_main)
                );

                // 이후 MathJax.typeset()를 불러줘야 MathJax가 preview에 반영된다.
                MathJax.typeset();
            }

            // MathJax가 로딩되어 있지 않은 경우에는 굳이 escape 할 필요가 없다.
            else {
                let result = HtmlSanitizer.SanitizeHtml(self.md.render(self.getMarkdownText()));
                diff.changeDiff(diff.stringToHTML(result), document.querySelector(self.rmde_preview_main));
            }

        }, 200);
    }

    divideIntoMarkdownAndHtml(content) {
        // 보안을 위해 HTML 파싱없이 이런 형태로 된 코드가 마지막 element로 있어야만 마크다운 텍스트로 인정한다.
        // 정규표현식 쓰기가 귀찮아서..
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

        // Markdown 데이터가 없으면 turndown으로 변환해서 rmde_editor_textarea에 넣어준다.
        if (markdown_text === null) {
            // Markdown 텍스트가 없으면 Turndown을 사용한다.
            let turndownService = new TurndownService();
            let markdown_text_turndown = turndownService.turndown(html_text);
            $(this.rmde_editor_textarea).val(markdown_text_turndown);

            // Preview에 상부에서 받은 html 데이터를 넣어준다.
            $(this.rmde_preview_main).html(html_text);
        } else {
            // Markdown 데이터가 있으면 rmde_editor_textarea에도 넣어주고
            $(this.rmde_editor_textarea).val(decodeURI(markdown_text));

            // Preview에 상부에서 받은 html 데이터를 넣어주고
            $(this.rmde_preview_main).html(html_text);
        }
    }

    //// Interface functions below ////

    // Get mixed html data which contains markdown text and corresponding html text
    getHtmlData() {
        var content_html = this.getHtmlText();
        var content_md = encodeURI(this.getMarkdownText());
        return content_html + this.bottom_tag_head + content_md + this.bottom_tag_tail;
    }

    // DB에서 가져온 HTML을 preview에 넣어주고 그 중 앞부분에 숨긴 markdown text를 추출해서 에디터에 넣어준다.
    // 만약숨긴 markdown text가 없으면 turndown 서비를 이용해 전환해준다.
    putHtmlData(html) {
        this.divideIntoMarkdownAndHtml(html);

        // TextAreaCount를 init한다.(편집화면에 텍스트 들어간 이후 init하는 것이 좋다.)
        this.textareaCount = new TextareaCount(this.rmde_editor_textarea, this.rmde_editor_ruler_for_scroll);
        this.textareaCount.setText($(this.rmde_editor_textarea).val());

        // 클래스를 새로 생성해 내용을 업데이트 하는 경우 this.previewEnabled는 제대로 된 상태가 아닐 수 있다.
        // 그래서 preview는 무조건 업데이트한다.
        this.renderMarkdownTextToPreview();
    }

    // Get whole HTML text from the simple editor
    getHtmlText() {
        return $(this.rmde_preview_main).html();
    }

    // Get whole markdown text from the simple editor
    getMarkdownText() {
        return $(this.rmde_editor_textarea).val();
    }

    // Insert markdown text into the simple editor at current cursor position
    insertMarkdownText(data) {
        let currnet_element = document.querySelector(this.rmde_editor_textarea);
        currnet_element.focus();
        let startPos = currnet_element.selectionStart;
        let endPos = currnet_element.selectionEnd;
        let preText = currnet_element.value;
        currnet_element.value =
            preText.substring(0, startPos) +
            data +
            preText.substring(endPos, preText.length);

        // move cursor to end of pasted text
        let cursorpos = startPos + data.length;
        currnet_element.setSelectionRange(cursorpos, cursorpos);

        if (this.previewEnabled)
            this.renderMarkdownTextToPreview();
    }

    setHeight(height) {
        $(this.rmde_root).css("height", height);

        this.totalHeight = $(this.rmde_root).height();
        let editorHeight = this.totalHeight - 30;

        $(this.rmde_editor).css("height", editorHeight);
        $(this.rmde_editor_textarea).css("height", editorHeight);
    }

    getHeight() {
        return this.totalHeight;
    }
}

export default RhymixMarkdownEditor;