import $ from "jquery";
import MarkdownIt from "markdown-it";
import mdiFootNote_ from "markdown-it-footnote";
import mdiAbbr_ from "markdown-it-abbr";
import mdiMark_ from "markdown-it-mark";
import TurndownService from "turndown";
import HtmlSanitizer from "./lib/htmlSanitizer";
import diff from "./lib/changeDiff";
import markdown_it_inject_linenumbers from "./lib/markdown-it-inject-linenumbers";
import TextareaCount from "./lib/textareacount";

export const mdiFootNote = mdiFootNote_;
export const mdiAbbr = mdiAbbr_;
export const mdiMark = mdiMark_;

const RhymixMarkdownEditor = function () {

    this.bottom_tag_head = "<code id='RhymixMarkdownEditor-MarkdownText' style='display:none'>";
    this.bottom_tag_tail = "</code>"; 
    
    this.id = null;
    this.previewEnabled = false;
    this.totalHeight = 600;
    this.resizeTimer = null;

    this.init = function (editor_wrap_id, content_key, html_input) {
        if (this.id) {
            console.error("This Rhymix Markdown Editor has already been initialized.");
            return false;
        }
        this.id = editor_wrap_id;
        this.content_key = content_key;
        let self = this;

        let rmde_btn_preview = editor_wrap_id + " .rmde_btn_preview";
        let rmde_editor_ruler_for_scroll = editor_wrap_id + " #rmde_editor_ruler_for_scroll";
        let rmde_editor_textarea = editor_wrap_id + " #rmde_editor_textarea";
        let rmde_preview = editor_wrap_id + " .rmde_preview";

        let html_data = '\
            <div class="rmde_class_root">\
                <div class="rmde_toolbar">\
                    <ul>\
                        <li><button type="button" class="rmde_btn_preview">Preview</button></li>\
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
        $(editor_wrap_id).html(html_data);
        // 초기에 preview는 숨긴다.
        $(rmde_preview).hide();

        // Rhymix에서 받은 문자열을 나누어서 편집화면과 preview에 반영한다.
        self.divideIntoMarkdownAndHtml(html_input);
        
        // TextAreaCount를 init한다.(편집화면에 텍스트 들어간 이후 init하는 것이 좋다.)
        this.textareaCount = new TextareaCount(rmde_editor_textarea, rmde_editor_ruler_for_scroll);
        this.textareaCount.setText($(rmde_editor_textarea).val());

        // 이벤트 처리를 해 준다.
        // 이 function 안에서는 this 대신 self를 쓴다.
        $(function () {
            // Preview 버튼이 눌러진 경우
            $(rmde_btn_preview).on("click", function () { 
                self.togglePreview(); 
                self.textareaCount.updateEditorSize();
                self.textareaCount.setText($(rmde_editor_textarea).val());
            });

            /*// 편집창에서 마우스 우클릭될 때 preview 위치도 조정해준다.
            //$(code).on('contextmenu', function (e) {
            //e.preventDefault();*/
            $(rmde_editor_textarea).on("click", function (e) {
                // preview가 열려 있을 때만 조정한다.
                if (self.previewEnabled) {
                    var textLineNo = self.textareaCount.getLineCountByScrollY(
                        $(rmde_editor_textarea).scrollTop() + e.pageY - $(rmde_editor_textarea).offset().top);
                    var scrollY = self.textareaCount.getScrollYbyLineCount(textLineNo);
                    //console.log("current line(click)", textLineNo, $(rmde_editor_textarea).scrollTop(), $(rmde_editor_textarea).offset().top, e.pageY, scrollY);
                    self.movePreviewPosition(textLineNo, false, scrollY - $(rmde_editor_textarea).scrollTop());
                }
            });

            // 내용 수정이 되면 업데이트해준다.
            //$(code).bind("keyup mouseup", function () {
            $(rmde_editor_textarea).on("input paste", function () {
                if (self.previewEnabled) self.renderMarkdownData();
                self.textareaCount.updateEditorSize();
                self.textareaCount.setText($(rmde_editor_textarea).val());
            });

            //// 각종 키 처리를 해 준다. ////
            $(window).on("keydown", function (e) {
                let keyCode = e.key || e.keyCode;
                // Ctrl+`의 경우 preview를 토글한다.
                if (keyCode === "`" && e.ctrlKey) {
                    self.togglePreview();
                    if (self.previewEnabled) {
                        self.textareaCount.updateEditorSize();
                        self.textareaCount.setText($(rmde_editor_textarea).val());
                        var textLineNo = self.textareaCount.getLineCountByScrollY(
                            $(rmde_editor_textarea).scrollTop());
                        var scrollY = self.textareaCount.getScrollYbyLineCount(textLineNo);
                        self.movePreviewPosition(textLineNo, false, scrollY - $(rmde_editor_textarea).scrollTop());
                    }
                }
            });


            // Textarea 전용
            $(rmde_editor_textarea).on("keydown", function (e) {
                let keyCode = e.key || e.keyCode;
                // 탭키가 눌러지면 편집창을 벗어나지 않고 탭을 넣을 수 있도록 해 준다.
                if (keyCode === "Tab") {
                    var element = document.querySelector(rmde_editor_textarea);
                    let v = element.value,
                        s = element.selectionStart,
                        e = element.selectionEnd;
                    //console.log(v,s,e);
                    element.value = v.substring(0, s) + "\t" + v.substring(e);
                    element.selectionStart = element.selectionEnd = s + 1;
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
                    self.renderMarkdownData();
                    var save_content = self.getHtmlData();
                    content_input.val(save_content);
                    doDocumentSave(this);
                }
            });

            // 에디터를 스크롤 할때 preview도 스크롤해준다.
            $(rmde_editor_textarea).on("scroll", function (e) {
                // preview가 열려 있을 때만 조정한다.
                if (self.previewEnabled) {
                    var textLineNo = self.textareaCount.getLineCountByScrollY(
                        $(rmde_editor_textarea).scrollTop());
                    var scrollY = self.textareaCount.getScrollYbyLineCount(textLineNo);
                    var clientHeight = document.querySelector(rmde_editor_textarea).clientHeight;
                    var scrollHeight = $(rmde_editor_textarea).prop('scrollHeight');
                    if(clientHeight + $(rmde_editor_textarea).scrollTop() >= scrollHeight) {
                        self.movePreviewPosition(-1, false, scrollY - $(rmde_editor_textarea).scrollTop());
                    }
                    else self.movePreviewPosition(textLineNo, false, scrollY - $(rmde_editor_textarea).scrollTop());
                }
            });

            // 에디터 크기가 변하면 TextareCount도 재설정해야한다.
            $(window).on("resize", function (e) {
                clearTimeout(self.resizeTimer);
                self.resizeTimer = setTimeout(function(){
                    //console.log("onresize textarea");
                    self.textareaCount.updateEditorSize();
                    self.textareaCount.setText($(rmde_editor_textarea).val());
                }, 300);

            });
        });
    };

    this.togglePreview = function () {
        let editor_wrap_id = this.id;
        let rmde_root = editor_wrap_id + " .rmde_class_root";
        let rmde_toolbar = editor_wrap_id + " .rmde_toolbar";
        let rmde_editor = editor_wrap_id + " .rmde_editor";
        let rmde_editor_textarea = editor_wrap_id + " #rmde_editor_textarea"
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

    // 지정된 markdown 행번호에 해당하는 preview HTML을 preview 상단으로 이동한다
    this.movePreviewPosition = function (
        linenum,
        animate = true,
        slideDown = 0     // 스크롤 미세조정을 위해 얼마나 더 내릴 것인가(덜 끌어올릴 것인가) 결정
    ) {
        let editor_wrap_id = this.id;
        let rmde_preview_main = editor_wrap_id + " .rmde_preview_main";

        //console.log("movePreviewPosition", linenum, animate, slideDown);

        if(linenum == -1) {
            $(rmde_preview_main).stop(true).animate({ scrollTop: $(rmde_preview_main).prop('scrollHeight'), }, 100, "linear");
            return;
        }

        // 해당 행에 맞는 preview 위치로 preview 텍스트를 옮긴다.
        let offset = $(`[data-source-line="${linenum}"]`).offset();
        if(offset == undefined) return;

        // 첫번째 줄이 정의되어 있지 않다면 맨 앞으로 스크롤하고 그렇지 않으면 적절히 계산해서 스크롤한다.
        let scrollval =
            typeof offset !== "undefined"
                ? offset.top + ($(rmde_preview_main).scrollTop() - $(rmde_preview_main).offset().top) - slideDown
                : 0;
        if (scrollval < 0) scrollval = 0;

        if(linenum == 0) $(rmde_preview_main).stop(true).animate({ scrollTop: 0, }, 100, "linear");
        else $(rmde_preview_main).stop(true).animate({ scrollTop: scrollval, }, 100, "linear");

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

    // encodes LaTex text into URI
    this.escapeMathJax = function (text) {
        // \$는 따로 escape 해 준다.($ 문자를 표현하기 위한 고육지책)
        var unescapedText = text.replace("\\$", "#36#X21kZV90b29sYmFyIj4");
        // $$~~$$, \[~~\], $~~$로 둘러싸여 있는 문자열은 해당 $$, \[\], $$까지 모두 인코딩하여 HTML 변환 및 sanitizing에 혼선이 없도록 한다.
        var latexReg1 = /(\$\$)[\w\W]+?(\$\$)|(\\\[)[\w\W]+?(\\\])|(\\\()[\w\W]+?(\\\))|\$[\w\W]+?\$/gm;
        return unescapedText.replace(latexReg1, function (match, p1, p2, p3, p4, offset, string) {
            return encodeURI(match.replace("<", "&lt;"))
        });
    }

    // decode LaTex text from URI
    this.unescapeMathJax = function (text) {
        var latexReg2 = /(\$\$)[\w\W]+?(\$\$)|(\%5C\%5B)[\w\W]+?(\%5C\%5D)|(\%5C\x28)[\w\W]+?(\%5C\x29)|(([^\\]\$)|(^\$))[\w\W]*?([^\\]\$)/gm;
        let unescapedText = text.replace(latexReg2, function (match, p1, p2, p3, p4, offset, string) {
            return decodeURI(match)
        });
        return unescapedText.replace("#36#X21kZV90b29sYmFyIj4", "\\$");     
    }

    // render current markdown text to preview window as html format
    this.renderMarkdownData = function () {
        let preview_main = this.id + " .rmde_preview_main";

        let md = MarkdownIt({
            html: true,
            breaks: true,
            linkify: true,
            typographer: true,
        }).use(mdiFootNote).use(mdiAbbr).use(mdiMark).use(markdown_it_inject_linenumbers);

        // 변환한다.
        let escapedMarkdownText = this.escapeMathJax(this.getMarkdownText());
        let convertedText = HtmlSanitizer.SanitizeHtml(md.render(escapedMarkdownText));
        let unescapedLatexHtml = this.unescapeMathJax(convertedText);

        // 이전과 비교하여 바뀐 부분만 반영되도록 한다.
        diff.changeDiff(
            diff.stringToHTML(unescapedLatexHtml),
            document.querySelector(preview_main)
        );

        // 이후 MathJax.typeset()를 불러줘야 MathJax가 preview에 반영된다.
        if (typeof MathJax !== "undefined") MathJax.typeset();

        // 원래 루틴은 아래와 같다.
        //let result = HtmlSanitizer.SanitizeHtml(md.render(this.getMarkdownText()));
        //diff.changeDiff(diff.stringToHTML(result), document.querySelector(preview_main));
    };

    this.divideIntoMarkdownAndHtml = function (content) {
        // 보안을 위해 HTML 파싱없이 이런 형태로 된 코드가 마지막 element로 있어야만 마크다운 텍스트로 인정한다.
        // 정규표현식 쓰기가 귀찮아서..
        // "<code id='RhymixMarkdownEditor-MarkdownText' style='display:none'>[Markdown text]</code>"
        // 맨 앞으로 두면 첫번째 노드 설정을 해 둔 경우 문제가 발생한다. 그래서 맨 뒤로 두었다.
        let md_start = content.lastIndexOf(this.bottom_tag_head);
        let md_end = content.lastIndexOf(this.bottom_tag_tail);
        let markdown_text = null;
        let html_text = null;
        if(md_start >= 0 
            && md_end + this.bottom_tag_tail.length === content.length
            && md_end > md_start + this.bottom_tag_head.length) {
            html_text= content.substr(0, md_start);
            markdown_text= content.slice(md_start + this.bottom_tag_head.length, md_end);
        } else {
            markdown_text= null;
            html_text= content;
        }

        let editor_wrap_id = this.id;
        let rmde_editor_textarea = editor_wrap_id + " #rmde_editor_textarea"
        let rmde_preview_main = editor_wrap_id + " .rmde_preview_main";

        // Markdown 데이터가 없으면 turndown으로 변환해서 rmde_editor_textarea에 넣어준다.
        if(markdown_text === null)
        {
            // Preview에 상부에서 받은 html 데이터를 넣어주고
            $(rmde_preview_main).html(html_text);

            // Markdown 텍스트가 없으면 Turndown을 사용한다.
            let turndownService = new TurndownService();
            let markdown_text_turndown = turndownService.turndown(html_text);
            $(rmde_editor_textarea).val(markdown_text_turndown);
        }
        else
        {
            // Markdown 데이터가 있으면 rmde_editor_textarea에도 넣어주고
            $(rmde_editor_textarea).html(markdown_text);

            // Preview에 상부에서 받은 html 데이터를 넣어주고
            $(rmde_preview_main).html(html_text);
        }
    }

    //// Interface functions below ////

    // Get mixed html data which contains markdown text and corresponding html text
    this.getHtmlData = function () {
        var content_html = this.getHtmlText();
        var content_md = this.getMarkdownText();
        return content_html + this.bottom_tag_head + content_md + this.bottom_tag_tail;
    }

    // DB에서 가져온 HTML을 preview에 넣어주고 그 중 앞부분에 숨긴 markdown text를 추출해서 에디터에 넣어준다.
    // 만약숨긴 markdown text가 없으면 turndown 서비를 이용해 전환해준다.
    this.putHtmlData = function (html) {
        divideIntoMarkdownAndHtml(html);
        if (this.previewEnabled) this.renderMarkdownData();
    };

    // Get whole HTML text from the simple editor
    this.getHtmlText = function () {
        let preview_main = this.id + " .rmde_preview_main";
        return $(preview_main).html();
    };

    // Get whole markdown text from the simple editor
    this.getMarkdownText = function () {
        let code = this.id + " #rmde_editor_textarea";
        return $(code).val();
    };

    // Insert markdown text into the simple editor at current cursor position
    this.insertMarkdownText = function (data) {
        let element_selector = this.id + " #rmde_editor_textarea";
        let currnet_element = document.querySelector(element_selector);
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

        if (this.previewEnabled) this.renderMarkdownData();
    };

    this.getSelectedMarkdownText = function (el) {
        let txtarea = document.querySelector(el);
        let start = txtarea.selectionStart;
        let finish = txtarea.selectionEnd;
        let sel = txtarea.value.substring(start, finish);

        return sel;
    };    

    this.setHeight = function (height) {
        let rmde_root = this.id + " .rmde_class_root";
        let rmde_editor = this.id + " .rmde_editor";
        let rmde_editor_textarea = this.id + " #rmde_editor_textarea";

        $(rmde_root).css("height", height);

        this.totalHeight = $(rmde_root).height();
        let editorHeight = this.totalHeight - 30;

        $(rmde_editor).css("height", editorHeight);
        $(rmde_editor_textarea).css("height", editorHeight);
    };

    this.getHeight = function () {
        return this.totalHeight;
    };

}

export default RhymixMarkdownEditor;