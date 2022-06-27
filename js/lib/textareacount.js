// TextAreaCount

import $ from "jquery";

const TextAreaCount = function () {

    this.lineCount = null;
    this.lineCounts = [];
    this.currentText = null;
    this.fontHeight = 0;
    this.textHeight = 0;
    this.editorWidth = 0;
    
    // 해당 TextArea의 정보를 추출한다.
    this.getTextAreaInfo = function (elementSelector) {
        var el = $(elementSelector);
        // TODO: 해당 TextArea의 내부(padding 제외한) 폭, 너비, 폰트 종류 및 사이즈, text-height를 구한다.

    }

    // 계산을 수행할 텍스트를 등록한다.
    this.registerText (text) {
        this.currentText = text;
        lines = text.split("\n");
        for(let textLine in lines)
        {

        }
    }

    // TODO: 속도를 높이기 위해 특정 라인이 변경되면 그 부분만 변동할 수 있도록 해야 할 수도 있다.

    // 현재 정보의 조건하에서 해당 택스트가 몇 줄을 차지할 지 계산한다.
    this.getLineCount = function (text) {

    }

    // 지정된 Y 좌표면 몇 번째 줄이 될 지 계산해 리턴한다.
    this.getLineCountByY = function (y) {

    }

    // 지정된 줄이 Y 좌표 어디에 위치할 지 리턴한다.
    this.getYbyLineCount = function (lineCount) {

    }

}

export default TextAreaCount;