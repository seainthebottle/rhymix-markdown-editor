// TextAreaCount

import $ from "jquery";

const TextAreaCount = function () {

    this.lineCount = null;
    this.lineCounts = [];
    this.currentText = null;
    this.editorWidth = 0;
    this.standardNode = document.getElementById("StandardNode");
    
    // 해당 TextArea의 정보를 추출해 기억한다.
    this.getTextAreaInfo = function (elementSelector) {
        this.standardNode.setAttribute("style", "position: absolute;visibility: hidden; \
            height: auto; width: auto; white-space: nowrap;");

        var el = $(elementSelector);

        this.editorWidth = el.width(); // padding 등을 뺀 실제 택스트가 들어가는 너비
        this.standardNode.setAttribute("font-size") = el.css("font-size"); 
        this.standardNode.setAttribute("font-family") = el.css("font-family"); 
        this.standardNode.setAttribute("font-weight") = el.css("font-weight");
        this.standardNode.setAttribute("letter-spacing") = el.css("letter-spacing"); 
        this.standardNode.setAttribute("word-spacing") = el.css("word-spacing");  

    }

    // 계산을 수행할 텍스트를 등록한다.
    this.registerText (text) {
        // 우선 각 줄의 너비를 구하고 이로써  overflow되는 줄을 파악해 총 줄수를 구하고 
        // scrollHeight를 이용해 높이를 구해 줄수로 나누어 한줄당 높이도 구한다.
        // 한줄당 높이를 구하는 것이 브라우저 차이로 인해 이 방법이 가장 안정적일 듯
        this.currentText = text;
        lines = text.split("\n");
        for(let textLine in lines)
        {
            var width = this.standardNode.text(textLine);
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