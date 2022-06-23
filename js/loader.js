"use strict";

(function ($) {
    // .rmde_main 태그를 기준으로 에디터 모듈을 설치한다.
    // 즉, 에디터 메인 클래스를 생성하고 그 클래스에 상부에서 받은 변수를 보내준다.
    $(".rmde_wrap").each(function () {
        var main_element = $(this);

        var rmde = new RhymixMarkdownEditor();

    })

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
})(jQuery);