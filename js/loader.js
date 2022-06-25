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
            console.log("Loading1 .rmde_wrap", editor_sequence, content_key, primary_key);
            var html_input = insert_form
                .find("input,textarea")
                .filter("[name=" + content_key + "]");
            var editor_height = rmde_wrap.data("editor-height");
            var editor_wrap = "#rmde_wrap_" + editor_sequence;

            console.log("Loading2 .rmde_wrap");
            var where = null;
            var target = insert_form
                .find("input,textarea")
                .filter("[name=" + primary_key + "]");


            console.log("begin init RhymixMarkdownEditor");
            var rmde = new RhymixMarkdownEditor();
            rmde.init(editor_wrap, content_key);
            rmde.setHeight(editor_height);

            // Set editor sequence and other info into the form.
            console.log("Set editor sequence");
            insert_form[0].setAttribute("editor_sequence", editor_sequence);
            editorRelKeys[editor_sequence] = {};
            editorRelKeys[editor_sequence].primary = insert_form
                .find("input[name='" + primary_key + "']")
                .get(0);
            editorRelKeys[editor_sequence].content = html_input;
            editorRelKeys[editor_sequence].func = editorGetContent;

            // Copy edited content to the actual input element.
            console.log("Copy edited content");
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