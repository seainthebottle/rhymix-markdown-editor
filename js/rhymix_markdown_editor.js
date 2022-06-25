import $ from "jquery";
import MarkdownIt from "markdown-it";
import mdiFootNote_ from "markdown-it-footnote";
import mdiAbbr_ from "markdown-it-abbr";
import mdiMark_ from "markdown-it-mark";
import HtmlSanitizer from "./lib/htmlSanitizer";
import diff from "./lib/changeDiff";
import markdown_it_inject_linenumbers from "./lib/markdown-it-inject-linenumbers";

export const mdiFootNote = mdiFootNote_;
export const mdiAbbr = mdiAbbr_;
export const mdiMark = mdiMark_;

const RhymixMarkdownEditor = function () {
    this.id = null;
    this.previewEnabled = false;
    this.onCtrl = false;
    this.totalHeight = 600;

    this.init = function (editor_wrap_id, content_key, html_input) {
        if (this.id) {
            console.error("This Rhymix Markdown Editor has already been initialized.");
            return false;
        }
        this.id = editor_wrap_id;
        this.content_key = content_key;
        let self = this;

        let rmde_btn_preview = editor_wrap_id + " .rmde_btn_preview";
        let rmde_preview = editor_wrap_id + " .rmde_preview";
        let rmde_editor_textarea = editor_wrap_id + " .rmde_editor_textarea";

        let html_data = '\
            <div class="rmde_class_root">\
                <div class="rmde_toolbar">\
                    <ul>\
                        <li><button type="button" class="rmde_btn_preview">Preview</button></li>\
                    </ul>\
                </div>\
                <div class="rmde_editor">\
                    <textarea class="rmde_editor_textarea"></textarea>\
                </div>\
                <div class="rmde_preview">\
                    <div class="rmde_preview_title">Preview screen</div>\
                    <div class="rmde_preview_main rhymix_content"></div>\
                </div>\
            </div>';
        // .rmde_class_root에 위의 html을 삽입한다.
        $(editor_wrap_id).html(html_data);
        // 초기에 preview는 숨긴다.
        $(rmde_preview).hide();
        // Preview에 상부에서 받은 html 데이터를 넣어주고
        console.log(".rmde_preview_main <== ", html_input);
        $('.rmde_preview_main').html(html_input);
        // Markdown 데이터가 있으면 rmde_editor_textarea에도 넣어주고
        // Markdown 데이터가 없으면 turndown으로 변환해서 rmde_editor_textarea에 넣어준다.

        // 이벤트 처리를 해 준다.
        $(function () {
            // Preview 버튼이 눌러진 경우
            $(rmde_btn_preview).on("click", function () { self.togglePreview(); });

            // 편집창에서 마우스 우클릭될 때 preview 위치도 조정해준다.
            //$(code).on('contextmenu', function (e) {
            //e.preventDefault();
            $(rmde_editor_textarea).on("click", function (e) {
                // preview가 열려 있을 때만 조정한다.
                if (self.previewEnabled)
                    self.setPreviewPosition(this.value, this.selectionStart, true, e.pageY);
            });

            // 내용 수정이 되면 업데이트해준다.
            //$(code).bind("keyup mouseup", function () {
            $(rmde_editor_textarea).on("input paste", function () {
                if (self.previewEnabled) self.renderMarkdownData();
            });

            // 각종 키 처리를 해 준다.
            $(rmde_editor_textarea).on("keydown", function (e) {
                console.log("key down");
                let keyCode = e.key || e.keyCode;
                if (keyCode === "Control") self.onCtrl = true;
                // 탭키가 눌러지면 편집창을 벗어나지 않고 탭을 넣을 수 있도록 해 준다.
                else if (keyCode === "Tab") {
                    let v = this.value,
                        s = this.selectionStart,
                        e = this.selectionEnd;
                    this.value = v.substring(0, s) + "\t" + v.substring(e);
                    this.selectionStart = this.selectionEnd = s + 1;
                    return false;
                }
                // Ctrl+`의 경우 preview를 토글한다.
                else if (keyCode === "`" && self.onCtrl) {
                    console.log("toggle key on");
                    self.togglePreview();
                    if (self.previewEnabled)
                        self.setPreviewPosition(
                            this.value,
                            this.selectionStart,
                            false
                        );
                }
                // Ctrl+s의 경우 임시저장한다.
                else if (keyCode === "s" && self.onCtrl) {
                    e.preventDefault();
                    // 임시저장 이외에 일반저장도 구현하려면 modules/document/document.controller.php를 수정해야 한다.
                    var content_key = self.content_key;
                    var insert_form = $(this).closest("form");
                    // 편집 textarea 내의 텍스트 내용
                    var content_input = insert_form
                        .find("input,textarea")
                        .filter("[name=" + content_key + "]");
                    var markdown_input = insert_form
                        .find("input,textarea")
                        .filter("[name=markdown_content]");
                    // preview로 markdown 변환된 내용을 반영해 주고
                    self.renderMarkdownData();
                    // preview의 내용을 가져온다.
                    var content_html = self.getHtmlText();
                    content_input.val(content_html);
                    // markdown text는 따로 가져온다.
                    var content_md = self.getMarkdownText();
                    markdown_input.val(content_md);
                    console.log(content_key, "\n", content_html, "\n", content_md);
                    doDocumentSave(this);
                }
            });

            // 단축키 처리를 위해
            $(rmde_editor_textarea).on("keyup", function (e) {
                let keyCode = e.key || e.keyCode;
                if (keyCode === "Control") self.onCtrl = false;
            });
        });
    };

    this.togglePreview = function () {
        let editor_wrap_id = this.id;
        let rmde_root = editor_wrap_id + " .rmde_class_root";
        let rmde_toolbar = editor_wrap_id + " .rmde_toolbar";
        let rmde_editor = editor_wrap_id + " .rmde_editor";
        let rmde_editor_textarea = editor_wrap_id + " .rmde_editor_textarea"
        let rmde_preview = editor_wrap_id + " .rmde_preview";
        let rmde_preview_title = editor_wrap_id + " .rmde_preview_title";
        let rmde_preview_main = editor_wrap_id + " .rmde_preview_main";

        let preview_display = $(rmde_preview).css("display");
        let preview_float = $(rmde_preview).css("float");

        let editor_height;

        if (preview_display == "none") {
            editor_height = this.totalHeight - 30;

            $(rmde_editor).css("width", "50%");
            $(rmde_editor).css("float", "left");
            $(rmde_editor).css("height", editor_height);
            $(rmde_editor_textarea).css("height", editor_height);
            $(rmde_preview).show();
            $(rmde_preview_title).hide();
            $(rmde_preview).css("width", "50%");
            $(rmde_preview).css("float", "right");
            $(rmde_preview).css("height", $(rmde_editor).css("height"));
            $(rmde_preview_main).css("height", $(rmde_editor_textarea).css("height"));

            $(rmde_root).css(
                "height",
                $(rmde_toolbar).height() + $(rmde_editor).height() + 3 // border에 따른 오차보정
                // box-sizing:border-box 시 border 계산에서 height() 함수와 css("height")는 다른 값을 출력할 수 있다.
            );

            this.renderMarkdownData();
            this.previewEnabled = true;
        } else if (preview_display == "block" && preview_float == "right") {
            editor_height = (this.totalHeight - 60) / 2;

            $(rmde_editor).css("width", "100%");
            $(rmde_editor).css("float", "none");
            $(rmde_editor).css("height", editor_height);
            $(rmde_editor_textarea).css("height", editor_height);
            $(rmde_preview).show();
            $(rmde_preview_title).show();
            $(rmde_preview).css("width", "100%");
            $(rmde_preview).css("float", "none");
            $(rmde_preview).css("height", editor_height + 30);
            $(rmde_preview_main).css("height", $(rmde_editor_textarea).css("height"));
            //$(rmde_preview).css("height", $(rmde_editor).css("height"));

            $(rmde_root).css("height",
                $(rmde_toolbar).height() + $(rmde_editor).height() + $(rmde_preview).height() + 4 // border에 따른 오차보정
            );

            this.renderMarkdownData();
            this.previewEnabled = true;
        } else {
            editor_height = this.totalHeight - 30;

            $(rmde_preview).hide();
            $(rmde_editor).css("height", editor_height);
            $(rmde_editor_textarea).css("height", editor_height);

            $(rmde_root).css("height",
                $(rmde_toolbar).height() + $(rmde_editor).height() + 3 // border에 따른 오차보정
            );

            this.previewEnabled = false;
        }
    };

    this.setPreviewPosition = function (
        value,
        selectionStart,
        animate = true,
        pageY = -1
    ) {
        let editor_wrap_id = this.id;
        let rmde_editor_textarea = editor_wrap_id + " .rmde_editor_textarea";
        let rmde_preview_main = editor_wrap_id + " .rmde_preview_main";

        // 현재 커서 위치의 텍스트 행 수를 구한다.
        let antetext = value.substring(0, selectionStart);
        let linenum = antetext.split("\n").length - 1;

        // 해당 행에 맞는 preview 위치로 preview 텍스트를 옮긴다.
        // preview에서 행번호가 정의되어 있는 줄까지 원본에서 올라가며 검색한다. (TODO: jQuery 노드 검색식을 좀 더 최적화해야 한다.)
        let offset = $(`[data-source-line="${linenum}"]`).offset();
        let height = $(`[data-source-line="${linenum}"]`).height();
        for (
            linenum = antetext.split("\n").length - 1;
            typeof offset === "undefined" && linenum > 0;
            linenum--,
            offset = $(`[data-source-line="${linenum}"]`).offset()
        );

        // 첫번째 줄이 정의되어 있지 않다면 맨 앞으로 스크롤하고 그렇지 않으면 적절히 계산해서 스크롤한다.
        let scrollgap = (pageY == -1) ?
            ($(rmde_preview_main).outerHeight() / 3) :
            (pageY - height / 2 - $(rmde_editor_textarea).offset().top);
        let scrollval =
            typeof offset !== "undefined"
                ? offset.top + ($(rmde_preview_main).scrollTop() - $(rmde_preview_main).offset().top) - scrollgap
                : 0;
        if (scrollval < 0) scrollval = 0;
        $(rmde_preview_main).stop(true).animate({ scrollTop: scrollval, }, 100, "linear");

        // 선택 부위를 하이라이트한다.
        if (animate) {
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 0.4, }, 400);
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 1.0, }, 400);
        }
    };

    // 선택된 에디터클래스의 바로 상부 wrap element의 아이디를 기억한다.
    this.selectInitializedEditor = function (id) {
        if ($(id).find(".rmde_class_root")) {
            this.id = id;
        } else {
            console.error("Rhymix Markdown Editor has not been initialized.");
        }
    };

    this.encodeReplacer = function (match, p1, p2, p3, p4, offset, string) {
        // replaces '<' into '< ' not to make this into html tags.
        return encodeURI(match.replace("<", "&lt;"));
    };

    this.decodeReplacer = function (match, p1, p2, p3, p4, offset, string) {
        return decodeURI(match);
    };

    // render current markdown text to preview window as html format
    this.renderMarkdownData = function () {
        let preview_main = this.id + " .rmde_preview_main";

        let md = MarkdownIt({
            html: true,
            breaks: true,
            linkify: true,
            typographer: true,
        }).use(mdiFootNote).use(mdiAbbr).use(mdiMark).use(markdown_it_inject_linenumbers);

        let unescapedMarkdownText = this.getMarkdownText();

        // encodes LaTex text into URI
        // \$는 따로 escape 해 준다.($ 문자를 표현하기 위한 고육지책)
        unescapedMarkdownText = unescapedMarkdownText.replace(
            "\\$",
            "#36#X21kZV90b29sYmFyIj4"
        );
        var latexReg1 = /(\$\$)[\w\W]+?(\$\$)|(\\\[)[\w\W]+?(\\\])|(\\\()[\w\W]+?(\\\))|\$[\w\W]+?\$/gm;
        let escapedMarkdownText = unescapedMarkdownText.replace(
            latexReg1,
            this.encodeReplacer
        );

        let result = HtmlSanitizer.SanitizeHtml(md.render(escapedMarkdownText));

        // decode LaTex text from URI
        var latexReg2 = /(\$\$)[\w\W]+?(\$\$)|(\%5C\%5B)[\w\W]+?(\%5C\%5D)|(\%5C\x28)[\w\W]+?(\%5C\x29)|(([^\\]\$)|(^\$))[\w\W]*?([^\\]\$)/gm;
        let escapedLatexHtml = result;
        let unescapedLatexHtml = escapedLatexHtml.replace(
            latexReg2,
            this.decodeReplacer
        );
        unescapedLatexHtml = unescapedLatexHtml.replace(
            "#36#X21kZV90b29sYmFyIj4",
            "\\$"
        );

        diff.changeDiff(
            diff.stringToHTML(unescapedLatexHtml),
            document.querySelector(preview_main)
        );
        // 이후 MathJax.typeset()를 불러줘야 Latex이 반영된다.
        if (typeof MathJax !== "undefined") MathJax.typeset();

        // 원래 루틴은 아래와 같다.
        //let result = HtmlSanitizer.SanitizeHtml(md.render(this.getMarkdownText()));
        //diff.changeDiff(diff.stringToHTML(result), document.querySelector(preview_main));
    };

    this.getHtmlText = function () {
        let preview_main = this.id + " .rmde_preview_main";
        return $(preview_main).html();
    };

    // TODO: DB에서 가져온 HTML을 preview에 넣어주고 그 중 앞부분에 숨긴 markdown text를 추출해서 에디터에 넣어준다.
    // 만약숨긴 markdown text가 없으면 turndown 서비를 이용해 전환해준다.
    this.putHtmlTextAndExtractMarkdown = function (html) {
        //let code = this.id + " .rmde_editor_textarea";
        //$(code).val(data);
        //if (this.previewEnabled) this.renderMarkdownData();
    };

    // get whole markdown text from the simple editor
    this.getMarkdownText = function () {
        let code = this.id + " .rmde_editor_textarea";
        return $(code).val();
    };

    // put markdown text into the simple editor at cursor position
    this.putMarkdownText = function (data) {
        let code = this.id + " .rmde_editor_textarea";
        this.insertAtCursor(code, data);
    };

    this.getSelectedMarkdownText = function (el) {
        let txtarea = document.querySelector(el);
        let start = txtarea.selectionStart;
        let finish = txtarea.selectionEnd;
        let sel = txtarea.value.substring(start, finish);

        return sel;
    };

    /*
    // insert markdown text into simple editor at current cursor position
    this.insertAtCursor = function (elm, markdown_text) {
        let selected_element = document.querySelector(elm);
        selected_element.focus();
        let startPos = selected_element.selectionStart;
        let endPos = selected_element.selectionEnd;
        let preText = selected_element.value;
        selected_element.value =
            preText.substring(0, startPos) +
            markdown_text +
            preText.substring(endPos, preText.length);

        // move cursor to end of pasted text
        let cursorpos = startPos + markdown_text.length;
        selected_element.setSelectionRange(cursorpos, cursorpos);

        if (this.previewEnabled) this.renderMarkdownData();
    };
    */

    this.setHeight = function (height) {
        let rmde_root = this.id + " .rmde_class_root";
        let rmde_editor = this.id + " .rmde_editor";
        let rmde_editor_textarea = this.id + " .rmde_editor_textarea";

        $(rmde_root).css("height", height);

        this.totalHeight = $(rmde_root).height();
        let editorHeight = this.totalHeight - 30;
        console.log("setHeight", rmde_root, this.totalHeight, editorHeight);

        $(rmde_editor).css("height", editorHeight);
        $(rmde_editor_textarea).css("height", editorHeight);
    };

    this.getHeight = function () {
        return this.totalHeight;
    };

}

export default RhymixMarkdownEditor;