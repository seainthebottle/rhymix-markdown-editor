"use strict";

import RhymixMarkdownEditor from "./rhymix_markdown_editor.js";
import TurndownService from "turndown";

(function ($) {
    // .rmde_instance 클래스를 기준으로 에디터 모듈을 설치한다.
    // 즉, 에디터 메인 클래스를 .rmde_instance 클래스 아래 생성하고 그 클래스에 상부에서 받은 변수를 보내준다.

    // Page load event handler.
    $(function () {
        $(".rmde_instance").each(function () {
            			
            // Load editor info.
            var rmde_instance = $(this);
            var editor_sequence = rmde_instance.data("editor-sequence");
            var content_key = rmde_instance.data("editor-content-key-name");
            var primary_key = rmde_instance.data("editor-primary-key-name");
            var insert_form = rmde_instance.closest("form");
            // 라이믹스에서 올려준 게시판 원문 HTML의 element
            var content_input = insert_form.find("input,textarea").filter("[name=" + content_key + "]");
            var editor_height = rmde_instance.data("editor-height");
            var rmde_instance_id = "#rmde_instance_" + editor_sequence;

            var rmde = new RhymixMarkdownEditor(rmde_instance_id);
            rmde.build(content_key);
            rmde.setHeight(editor_height);
			rmde.putHtmlData(content_input.val());

            // Set editor sequence and other info into the form.
            insert_form[0].setAttribute("editor_sequence", editor_sequence);
            editorRelKeys[editor_sequence] = {};
            editorRelKeys[editor_sequence].primary = insert_form.find("input[name='" + primary_key + "']").get(0);
            editorRelKeys[editor_sequence].content = content_input;
            editorRelKeys[editor_sequence].func = editorGetContent;

            // Copy edited content to the actual input element before save
            $('.btn_insert').on("click", function(event) {
                // preview로 markdown 변환된 내용을 반영해 주고
                rmde.renderMarkdownTextToPreview(0);
                var save_content = rmde.getHtmlData();
                content_input.val(save_content);
            });
        });
    });

    // Simulate CKEditor for file upload integration.
    // 그림 등의 파일 업로드 시 CKEditor 루틴을 차용한다.
    window._getCkeInstance = function (editor_sequence) {
        var rmde_instance_id = "#rmde_instance_" + editor_sequence;
        var rmde = new RhymixMarkdownEditor(rmde_instance_id);

		var turndownService = new TurndownService();

        return {
            getData: function () {
				return rmde.getHtmlData();
            },
            setData: function (content) {
				rmde.putHtmlData(content);
            },
            // markdown 원본이 없으면 html을 markdown으로 변환해 에디터에 보내준다.
            insertHtml: function (content) {
                var conv_markdown = turndownService.turndown(content);
                conv_markdown += "\n";
                rmde.insertMarkdownText(conv_markdown);
            },

        };
    };

})(jQuery);


// 에디터 개체를 얻는다.
function _getSimpleEditorInstance(editor_sequence) {
	var rmde_instance_id = "#rmde_instance_" + editor_sequence;
	var editor_obj = new RhymixMarkdownEditor(rmde_instance_id);

	return editor_obj;
}

// 에디터 개체에서 내용(html)을 추출한다.
function editorGetContent(editor_sequence) {
	return _getSimpleEditorInstance(editor_sequence).getMarkdownText().escape();
}

// 에디터 개체에서 내용을 지정된 내용으로 완전히 교체한다.
function editorReplaceHTML(iframe_obj, content) {
	var editor_sequence = parseInt(iframe_obj.id.replace(/^.*_/, ''), 10);
	_getSimpleEditorInstance(editor_sequence).putHtmlData(content);
}

// 에디터의 편집화면의 개체를 얻는다.
function editorGetIFrame(editor_sequence) {
	var editor = _getSimpleEditorInstance(editor_sequence);
	return $(editor.id).find(".rmde_editor_textarea").get(0);
}
