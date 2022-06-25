"use strict";

import RhymixMarkdownEditor from "./rhymix_markdown_editor.js";

(function ($) {
    // .rmde_wrap 클래스를 기준으로 에디터 모듈을 설치한다.
    // 즉, 에디터 메인 클래스를 .rmde_wrap 클래스 아래 생성하고 그 클래스에 상부에서 받은 변수를 보내준다.

    // Page load event handler.
    $(function () {
        $(".rmde_wrap").each(function () {
            console.log("Loading .rmde_wrap");
            var rmde_wrap = $(this);
            var editor_sequence = rmde_wrap.data("editor-sequence");
            var content_key = rmde_wrap.data("editor-content-key-name");
            var primary_key = rmde_wrap.data("editor-primary-key-name");
            var insert_form = rmde_wrap.closest("form");
            // 편집 textarea 내의 텍스트 내용
            var html_input = insert_form
                .find("input,textarea")
                .filter("[name=" + content_key + "]");
            var markdown_input = insert_form
                .find("input,textarea")
                .filter("[name=markdown_content]");
            var editor_height = editor.data("editor-height");
            var editor_wrap = "#mdeditor_" + editor_sequence;

            var where = null;
            var target = insert_form
                .find("input,textarea")
                .filter("[name=" + primary_key + "]");

            var rmde = new RhymixMarkdownEditor();
            rmde.init(editor_wrap, content_key);
            rmde.addPreviewClass("rhymix_content");

            rmde.setHeight(editor_height);
            var content = markdown_input.val();
            if (content) {
                rmde.changeContent(markdown_input.val());
            } else {
                content = html_input.val();
                markdown_input.val(content);
                rmde.changeContent(markdown_input.val());
            }

            // Set editor sequence and other info into the form.
            insert_form[0].setAttribute("editor_sequence", editor_sequence);
            editorRelKeys[editor_sequence] = {};
            editorRelKeys[editor_sequence].primary = insert_form
                .find("input[name='" + primary_key + "']")
                .get(0);
            editorRelKeys[editor_sequence].content = html_input;
            editorRelKeys[editor_sequence].func = editorGetContent;

            // Copy edited content to the actual input element.
            editor.on("mouseout change", function (event) {
                // preview로 markdown 변환된 내용을 반영해 주고
                rmde.renderMarkdownData();
                // preview의 내용을 가져온다.
                var html_content = rmde.getHtmlText();
                html_input.val(html_content);
                // markdown text는 따로 가져온다.
                var markdown_content = rmde.getMarkdownText();
                markdown_input.val(markdown_content);
                event.preventDefault();
            });
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