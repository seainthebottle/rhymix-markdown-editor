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
            console.error("This Rhymix Markdown Editor has already been initialized.");
            return false;
        }
        this.id = id;
        let self = this;

        let rmde_btn_preview = id + " .rmde_btn_preview";
        let rmde_preview = id + " .rmde_preview";
        let rmde_editor_textarea = id + " .rmde_editor_textarea";

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
                    <div class="rmde_preview_main"></div>\
                </div>\
            </div>';
        // .rmde_class_root에 위의 html을 삽입한다.
        $(id).html(html_data);
        // 초기에 preview는 숨긴다.
        $(rmde_preview).hide();
    }

    // 선택된 에디터클래스의 바로 상부 wrap element의 아이디를 기억한다.
    this.selectInitializedEditor = function (id) {
        if ($(id).find(".rmde_class_root")) {
            this.id = id;
        } else {
            console.error("Rhymix Markdown Editor has not been initialized.");
        }
    };

}

export default RhymixMarkdownEditor;