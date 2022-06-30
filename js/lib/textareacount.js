// TextareaCount

import $ from "jquery";

class TextareaCount {
    
    // 해당 Textarea의 정보를 추출해 기억한다 (처음 한 번만 호출한다.)
    constructor(editorSelector, hiddenSelector) {
        this.editorNode = $(editorSelector);
        this.standardNode = $(hiddenSelector);
        this.editorNodeElement = document.querySelector(editorSelector);
        this.standardNodeElement = document.querySelector(hiddenSelector);

        this.lineCount = 0;
        this.lineCounts = [];
        this.currentText = null;
        this.editorWidth = 0;
        this.lineHeight = 0;

        this.standardNode.css("position", "absolute");        
        this.standardNode.css("display", "inline-block");
        this.standardNode.css("visibility", "hidden");
        this.standardNode.css("height", "auto");

        this.standardNode.css("padding", this.editorNode.css("padding"));
        this.standardNode.css("font-size", this.editorNode.css("font-size"));
        this.standardNode.css("font-family", this.editorNode.css("font-family"));
        this.standardNode.css("font-weight", this.editorNode.css("font-weight"));
        this.standardNode.css("letter-spacing", this.editorNode.css("letter-spacing"));
        this.standardNode.css("word-spacing", this.editorNode.css("word-spacing")); 
        this.standardNode.css("white-space", this.editorNode.css("white-space"));
        // TODO: 텍스트 줄 바꿈 규칙(단어 줄바꿈)도 이전해야 한다.

        this.updateEditorSize();
    }

    // 에디터의 크기가 변하면 내부 파라미터도 재조정한다.
    updateEditorSize() {
        if(this.editorNode == undefined) return;

        this.editorPaddingTopHeight = parseInt(this.editorNode.css("padding-top"));
        this.editorPaddingHeight = this.editorNode.innerHeight() - this.editorNode.height();
        this.editorWidth = this.editorNode.width(); // padding 등을 뺀 실제 텍스트가 들어가는 너비
    }

    // 계산을 수행할 텍스트를 등록한다 (텍스트가 변경될 때마다 호출되어야 한다.)
    // 에디터의 폭이 바뀔 때에도 새로 호출해야 한다.
    setText(text) {
        if(this.editorNode == undefined) return;
        console.log("setText", text);
        // 내용이 바뀔 때 scrollbar 생성되어 clientWidth도 바뀔 수 있어서 매번 조정해야 한다.
        // standardNode는 태생적으로 스크롤바가 없으므로 outerWidth가 editorNode의 clientWidth와 일치하게 된다.
        this.standardNode.outerWidth(this.editorNodeElement.clientWidth);  
        //this.standardNode.css("background", "#003333");
        //console.log("setText clientWidth", this.editorNodeElement.clientWidth);
        // 우선 각 줄의 너비를 구하고 이로써  overflow되는 줄을 파악해 총 줄수를 구하고 
        // scrollHeight를 이용해 높이를 구해 줄수로 나누어 한줄당 높이도 구한다.
        // 한줄당 높이를 구하는 것이 브라우저 차이로 인해 이 방법이 가장 안정적일 듯
        this.currentText = text;
        // TODO: LaTex tag는 줄바꿈이 되는 부분을 한 덩어리로 봐야 하므로 이 부분은 split 처리되지 않도록 해야한다.
        var lines = text.split("\n");
        var totalWindowLines = 0;
        var unit_height = this.standardNode.text("0").height();
        var i = 0;
        for(let textLine of lines)
        {
            var node = this.standardNode.text(textLine);
            var height = node.height();
            if (textLine.length == 0) this.lineCounts[i] = 1; // 빈줄이라도 한줄을 인정한다.
            else this.lineCounts[i] = height / unit_height;
            //console.log("setText lineno:", i,  height, unit_height, this.lineCounts[i], textLine);
            totalWindowLines += this.lineCounts[i];
            i++;
        }
        this.lineCount = i;
        // TODO: this.lineHeight를 unit_height로 대체할 수 있을지 고민해봐야겠다. 
        this.lineHeight = (totalWindowLines > 0)? 
            (this.editorNode.prop('scrollHeight') - this.editorPaddingHeight) / totalWindowLines : 0;
        //console.log("setText", this.lineCount, this.editorNode.prop('scrollHeight'), this.editorPaddingHeight, totalWindowLines, this.lineHeight);
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
        if(this.lineHeight == 0) return 0;
        var trueY = (y > this.editorPaddingTopHeight)? y - this.editorPaddingTopHeight : y;
        var windowLinePos = trueY / this.lineHeight; // 윈도우 상에서는 몇 행인지(줄넘김도 한 행으로 포함해서)
        for (var textLineNo = 0, i = 0; i < parseInt(windowLinePos) && textLineNo < this.lineCount; textLineNo++, i+=this.lineCounts[textLineNo]);
        console.log("getLineCountByScrollY =", textLineNo, trueY, this.lineHeight, windowLinePos);
        return textLineNo;
        // TODO: 해당 행에 해당하는 줄번호가 preview에 없으면 찾아줘야 한다. 
    }

    // 지정된 줄이 Y 좌표 어디에 위치할 지 리턴한다.
    getScrollYbyLineCount(lineCount) {
        if(lineCount == 0) return 0;
        else if (lineCount > this.lineCount) return this.standardNode.scrollHeight();
        for(var i = 0; i < lineCount; i+= this.lineCounts[i]) return i * this.lineHeight;
    }

}

export default TextareaCount;