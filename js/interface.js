// Simple 에디터에서 차용되는 인터페이스 루틴들

// 에디터 개체를 얻는다.
function _getSimpleEditorInstance(editor_sequence) {
	var md_editor = "#markdown_editor" + editor_sequence;
	var editor_obj = new RhymixMarkdownEditor();
	editor_obj.selectInitializedEditor(md_editor);

	return editor_obj;
}

// 에디터 개체에서 내용(html)을 추출한다.
function editorGetContent(editor_sequence) {
	return _getSimpleEditorInstance(editor_sequence).getMarkdownText().escape();
}

// 에디터 개체에서 내용을 지정된 내용으로 대체한다.
function editorReplaceHTML(iframe_obj, content) {
	var editor_sequence = parseInt(iframe_obj.id.replace(/^.*_/, ''), 10);
	_getSimpleEditorInstance(editor_sequence).changeContent(content);
}

// 에디터의 편집화면의 개체를 얻는다.
function editorGetIFrame(editor_sequence) {
	var editor = _getSimpleEditorInstance(editor_sequence);
	return $(editor.id).find(".rmde_editor_textarea").get(0);
}
