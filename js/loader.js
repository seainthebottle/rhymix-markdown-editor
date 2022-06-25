"use strict";

import RhymixMarkdownEditor from "./rhymix_markdown_editor.js";

(function ($) {
    // .rmde_wrap 클래스를 기준으로 에디터 모듈을 설치한다.
    // 즉, 에디터 메인 클래스를 .rmde_wrap 클래스 아래 생성하고 그 클래스에 상부에서 받은 변수를 보내준다.

    // Page load event handler.
    $(function () {
        $(".rmde_wrap").each(function () {
            var rmde_wrap = $(this);
            var editor_sequence = rmde_wrap.data("editor-sequence");
            var content_key = rmde_wrap.data("editor-content-key-name");
            var primary_key = rmde_wrap.data("editor-primary-key-name");
            var insert_form = rmde_wrap.closest("form");
            // 라이믹스에서 올려준 게시판 원문 HTML
            var html_input = insert_form
                .find("input,textarea")
                .filter("[name=" + content_key + "]");
            var editor_height = rmde_wrap.data("editor-height");
            var editor_wrap_id = "#rmde_wrap_" + editor_sequence;
            console.log("Loader", editor_sequence, content_key, primary_key, insert_form, html_input.val());

            var rmde = new RhymixMarkdownEditor();
            console.log("html_input", content_key, html_input);
            rmde.init(editor_wrap_id, content_key, html_input.val());
            rmde.setHeight(editor_height);

            // Set editor sequence and other info into the form.
            insert_form[0].setAttribute("editor_sequence", editor_sequence);
            editorRelKeys[editor_sequence] = {};
            editorRelKeys[editor_sequence].primary = insert_form
                .find("input[name='" + primary_key + "']")
                .get(0);
            editorRelKeys[editor_sequence].content = html_input;
            editorRelKeys[editor_sequence].func = editorGetContent;

            // Load existing content.
            /*if (html_input.size()) {
                rmde_wrap.html(html_input.val());
            }*/

            /*// Copy edited content to the actual input element.
            rmde_wrap.on('', function() {
                html_input.val(content);
            });*/
        });

        // Simulate CKEditor for file upload integration.
        // 그림 등의 파일 업로드 시 CKEditor 루틴을 차용한다.
        window._getCkeInstance = function (editor_sequence) {
            var rmde_wrap_id = "#rmde_wrap_" + editor_sequence;
            var rmde = new RhymixMarkdownEditor();
            rmde.selectInitializedEditor(rmde_wrap_id);

            return {
                getData: function () {
                },
                setData: function (content) {
                },
                // markdown 원본이 없으면 html을 markdown으로 변환해 에디터에 보내준다.
                insertHtml: function (content) {
                },
            };
        };
    })
})(jQuery);