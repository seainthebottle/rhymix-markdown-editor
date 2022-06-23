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

    this.init = function (id) {
        if (this.id) {
            console.error("This MdEditor has already been initialized.");
            return false;
        }
        this.id = id;
        let self = this;
        let mde_preview = id + " .mde_preview";
        let mde_editor_textarea = id + " .mde_editor_textarea";
        let el_preview = id + " .mde_tb_preview";

        let html_data = '\
            <div class="mde_wrap">\
                <div class="mde_toolbar">\
                    <ul>\
                        <li><button type="button" class="mde_tb_preview">Preview</button></li>\
                    </ul>\
                </div>\
                <div class="mde_editor">\
                    <textarea class="mde_editor_textarea"></textarea>\
                </div>\
                <div class="mde_preview">\
                    <div class="mde_preview_title">Preview screen</div>\
                    <div class="mde_preview_main"></div>\
                </div>\
            </div>';
        $(id).html(html_data);
        $(mde_preview).hide();

        // 이벤트 처리를 해 준다.
        $(function () {
            // Preview 버튼이 눌러진 경우
            $(el_preview).on("click", function () { self.togglePreview(); });

            // 편집창에서 마우스 우클릭될 때 preview 위치도 조정해준다.
            //$(code).on('contextmenu', function (e) {
            //e.preventDefault();
            $(mde_editor_textarea).on("click", function (e) {
                // preview가 열려 있을 때만 조정한다.
                if (self.previewEnabled)
                    self.setPreviewPosition(this.value, this.selectionStart, true, e.pageY);
            });

            // 내용 수정이 되면 업데이트해준다.
            //$(code).bind("keyup mouseup", function () {
            $(mde_editor_textarea).on("input paste", function () {
                if (self.previewEnabled) self.renderMarkdownData();
            });

            // 각종 키 처리를 해 준다.
            $(mde_editor_textarea).on("keydown", function (e) {
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
                    /*let obj = document.getElementsByClassName("board_write").item(0);
                    obj.setAttribute("target", "#iframe_unseen");
                    //$("form").submit();

                    //doDocumentSave(this);
                    //self.doDocumentSave(document.getElementsByClassName("board_write").item(0));*/
                }
            });

            // 단축키 처리를 위해
            $(mde_editor_textarea).on("keyup", function (e) {
                let keyCode = e.key || e.keyCode;
                if (keyCode === "Control") self.onCtrl = false;
            });
        });
    };

    /* 게시글 저장 
    this.doDocumentSave = function (obj) {
        console.log("doDocumentSave");
        var editor_sequence = obj.getAttribute('editor_sequence');
        console.log(editor_sequence);
        var prev_content = editorRelKeys[editor_sequence].content.value;
        if (typeof (editor_sequence) != 'undefined' && editor_sequence && typeof (editorRelKeys) != 'undefined' && typeof (editorGetContent) == 'function') {
            var content = editorGetContent(editor_sequence);
            editorRelKeys[editor_sequence].content.value = content;
        }

        var params = {}, responses = ['error', 'message', 'document_srl'], elms = obj.elements, data = jQuery(obj).serializeArray();
        jQuery.each(data, function (i, field) {
            var val = jQuery.trim(field.value);
            if (!val) return true;
            if (/\[\]$/.test(field.name)) field.name = field.name.replace(/\[\]$/, '');
            if (params[field.name]) params[field.name] += '|@|' + val;
            else params[field.name] = field.value;
        });

        console.log(params, completeDocumentSave, responses, params, obj);

        $.ajax({
            url: '/',
            type: 'POST',
            data: {
                module: 'document',
                act: 'procDocumentTempSave',
                module_srl: '386695',
            },
            dataType: 'json',
            module_srl: '383517',
            contentType: 'application/json'
        })
            .done(function (data) {
                console.log("done", data);
            })
            .fail(function (xhr) {
                console.log("fail", xhr);
            });

        //exec_xml('document', 'procDocumentTempSave', params, completeDocumentSave, responses, params);

        editorRelKeys[editor_sequence].content.value = prev_content;
        return false;
    }*/

    this.togglePreview = function () {
        let id = this.id;
        let mde_wrap = id + " .mde_wrap";
        let mde_toolbar = id + " .mde_toolbar";
        let mde_editor = id + " .mde_editor";
        let mde_editor_textarea = id + " .mde_editor_textarea"
        let mde_preview = id + " .mde_preview";
        let mde_preview_title = id + " .mde_preview_title";
        let mde_preview_main = id + " .mde_preview_main";

        let preview_display = $(mde_preview).css("display");
        let preview_float = $(mde_preview).css("float");

        let editor_height;

        if (preview_display == "none") {
            editor_height = this.totalHeight - 30;

            $(mde_editor).css("width", "50%");
            $(mde_editor).css("float", "left");
            $(mde_editor).css("height", editor_height);
            $(mde_editor_textarea).css("height", editor_height);
            $(mde_preview).show();
            $(mde_preview_title).hide();
            $(mde_preview).css("width", "50%");
            $(mde_preview).css("float", "right");
            $(mde_preview).css("height", $(mde_editor).css("height"));
            $(mde_preview_main).css("height", $(mde_editor_textarea).css("height"));

            $(mde_wrap).css(
                "height",
                $(mde_toolbar).height() + $(mde_editor).height() + 3 // border에 따른 오차보정
                // box-sizing:border-box 시 border 계산에서 height() 함수와 css("height")는 다른 값을 출력할 수 있다.
            );

            this.renderMarkdownData();
            this.previewEnabled = true;
        } else if (preview_display == "block" && preview_float == "right") {
            editor_height = (this.totalHeight - 60) / 2;

            $(mde_editor).css("width", "100%");
            $(mde_editor).css("float", "none");
            $(mde_editor).css("height", editor_height);
            $(mde_editor_textarea).css("height", editor_height);
            $(mde_preview).show();
            $(mde_preview_title).show();
            $(mde_preview).css("width", "100%");
            $(mde_preview).css("float", "none");
            $(mde_preview).css("height", editor_height + 30);
            $(mde_preview_main).css("height", $(mde_editor_textarea).css("height"));
            //$(mde_preview).css("height", $(mde_editor).css("height"));

            $(mde_wrap).css("height",
                $(mde_toolbar).height() + $(mde_editor).height() + $(mde_preview).height() + 4 // border에 따른 오차보정
            );

            this.renderMarkdownData();
            this.previewEnabled = true;
        } else {
            editor_height = this.totalHeight - 30;

            $(mde_preview).hide();
            $(mde_editor).css("height", editor_height);
            $(mde_editor_textarea).css("height", editor_height);

            $(mde_wrap).css("height",
                $(mde_toolbar).height() + $(mde_editor).height() + 3 // border에 따른 오차보정
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
        let id = this.id;
        let mde_editor_textarea = id + " .mde_editor_textarea";
        let mde_preview_main = id + " .mde_preview_main";

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
            ($(mde_preview_main).outerHeight() / 3) :
            (pageY - height / 2 - $(mde_editor_textarea).offset().top);
        let scrollval =
            typeof offset !== "undefined"
                ? offset.top + ($(mde_preview_main).scrollTop() - $(mde_preview_main).offset().top) - scrollgap
                : 0;
        if (scrollval < 0) scrollval = 0;
        $(mde_preview_main).stop(true).animate({ scrollTop: scrollval, }, 100, "linear");

        // 선택 부위를 하이라이트한다.
        if (animate) {
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 0.4, }, 400);
            $(`[data-source-line="${linenum}"]`).animate({ opacity: 1.0, }, 400);
        }
    };

    this.selectInitializedEditor = function (id) {
        if ($(id).find(".mde_wrap")) {
            this.id = id;
        } else {
            console.error("MDEditor has not been initialized.");
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
        let preview_main = this.id + " .mde_preview_main";

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

    this.addPreviewClass = function (classname) {
        let preview_main = this.id + " .mde_preview_main";
        $(preview_main).addClass(classname);
    };

    this.getHtmlText = function () {
        let preview_main = this.id + " .mde_preview_main";
        return $(preview_main).html();
    };

    // get whole markdown text from the simple editor
    this.getMarkdownText = function () {
        let code = this.id + " .mde_editor_textarea";
        return $(code).val();
    };

    // put markdown text into the simple editor at cursor position
    this.putText = function (data) {
        let code = this.id + " .mde_editor_textarea";
        this.insertAtCursor(code, data);
    };

    this.getSelectedTxt = function (el) {
        let txtarea = document.querySelector(el);
        let start = txtarea.selectionStart;
        let finish = txtarea.selectionEnd;
        let sel = txtarea.value.substring(start, finish);

        return sel;
    };

    // insert text(myValue) into simple editor at cursor position
    this.insertAtCursor = function (el, myValue) {
        let myField = document.querySelector(el);
        myField.focus();
        let startPos = myField.selectionStart;
        let endPos = myField.selectionEnd;
        let preText = myField.value;
        myField.value =
            preText.substring(0, startPos) +
            myValue +
            preText.substring(endPos, preText.length);

        // move cursor to end of pasted text
        let cursorpos = startPos + myValue.length;
        myField.setSelectionRange(cursorpos, cursorpos);

        if (this.previewEnabled) this.renderMarkdownData();
    };

    this.changeContent = function (data) {
        let code = this.id + " .mde_editor_textarea";
        $(code).val(data);
        if (this.previewEnabled) this.renderMarkdownData();
    };

    this.setHeight = function (height) {
        let mde_wrap = this.id + " .mde_wrap";
        let mde_editor = this.id + " .mde_editor";
        let mde_editor_textarea = this.id + " .mde_editor_textarea";

        $(mde_wrap).css("height", height);

        this.totalHeight = $(mde_wrap).height();
        let editorHeight = this.totalHeight - 30;
        console.log("setHeight", this.totalHeight, editorHeight);

        $(mde_editor).css("height", editorHeight);
        $(mde_editor_textarea).css("height", editorHeight);
    };

    this.getHeight = function () {
        return this.totalHeight;
    };
};

export default RhymixMarkdownEditor;
