// TextareaCount

import $ from "jquery";

class TextareaCount {
    
    // 해당 Textarea의 정보를 추출해 기억한다 (처음 한 번만 호출한다.)
    constructor(elementSelector) {
        this.lineCount = 0;
        this.lineCounts = [];
        this.currentText = null;
        this.editorPaddingHeight = 0;
        this.editorWidth = 0;
        this.standardNode = document.getElementById("StandardNode");
        this.lineHeight = 0;

        this.standardNode.setAttribute("style", "position: absolute;visibility: hidden; \
            height: auto; width: auto; white-space: nowrap;");

        var el = $(elementSelector);

        this.editorPaddingHeight = el.height() - el.innerHeight();
        this.editorWidth = el.width(); // padding 등을 뺀 실제 택스트가 들어가는 너비
        this.standardNode.setAttribute("font-size", el.css("font-size")); 
        this.standardNode.setAttribute("font-family", el.css("font-family")); 
        this.standardNode.setAttribute("font-weight", el.css("font-weight"));
        this.standardNode.setAttribute("letter-spacing", el.css("letter-spacing")); 
        this.standardNode.setAttribute("word-spacing", el.css("word-spacing"));  

    }

    // 계산을 수행할 텍스트를 등록한다 (텍스트가 변경될 때마다 호출되어야 한다.)
    setText(text) {
        // 우선 각 줄의 너비를 구하고 이로써  overflow되는 줄을 파악해 총 줄수를 구하고 
        // scrollHeight를 이용해 높이를 구해 줄수로 나누어 한줄당 높이도 구한다.
        // 한줄당 높이를 구하는 것이 브라우저 차이로 인해 이 방법이 가장 안정적일 듯
        this.currentText = text;
        lines = text.split("\n");
        var totalWindowLines = 0;
        var i = 0;
        for(let textLine in lines)
        {
            var width = this.standardNode.text(textLine);
            this.lineCounts[i] = parseInt(width / this.editorWidth) + 1;
            totalWindowLines += this.lineCounts[i];
            i++;
        }
        this.lineCount = i;
        this.lineHeight = (totalWindowLines > 0)? this.standardNode.scrollHeight() / totalWindowLines : 0;
    }

    // TODO: 속도를 높이기 위해 특정 라인이 변경되면 그 부분만 변동할 수 있도록 해야 할 수도 있다.

    // 현재 정보의 조건하에서 해당 택스트가 몇 줄을 차지할 지 계산한다.
    getLineCount(text) {
        return this.lineCount;
    }

    getLineHeight(text) {
        return this.lineHeight;
    }

    // 지정된 Y 좌표면 텍스트의 몇 번째 행이 될 지 계산해 리턴한다.
    getLineCountByScrollY(y) {
        var windowLinePos = y / this.lineHeight; // 윈도우 상에서는 몇 행인지(줄넘김도 한 행으로 포함해서)
        for (var textLineNo = 0, i = 0; i < windowLinePos || textLineNo < this.lineCount; textLineNo++, i+=this.lineCounts[textLineNo]);
        return textLineNo;
    }

    // 지정된 줄이 Y 좌표 어디에 위치할 지 리턴한다.
    getScrollYbyLineCount(lineCount) {
        if(lineCount == 0) return 0;
        else if (lineCount > this.lineCount) return this.standardNode.scrollHeight();
        for(var i = 0; i < lineCount; i+= this.lineCounts[i]) return i * this.lineHeight;
    }

}

export default TextareaCount;