//JavaScript HTML Sanitizer, (c) Alexander Yumashev, Jitbit Software.

//homepage https://github.com/jitbit/HtmlSanitizer

//License: MIT https://github.com/jitbit/HtmlSanitizer/blob/master/LICENSE

const HtmlSanitizer = new (function () {
  let tagWhitelist_ = {
    A: true,
    ABBR: true,
    B: true,
    BLOCKQUOTE: true,
    BODY: true,
    BR: true,
    CENTER: true,
    CODE: true,
    DIV: true,
    EM: true,
    FONT: true,
    H1: true,
    H2: true,
    H3: true,
    H4: true,
    H5: true,
    H6: true,
    HR: true,
    I: true,
    IMG: true,
    LABEL: true,
    LI: true,
    MARK: true,
    OL: true,
    P: true,
    PRE: true,
    SMALL: true,
    SOURCE: true,
    SPAN: true,
    STRONG: true,
    TABLE: true,
    TBODY: true,
    TR: true,
    TD: true,
    TH: true,
    THEAD: true,
    UL: true,
    U: true,
    VIDEO: true,
    IFRAME: true,
    S: true,
    DEL: true,
    SUP: true,
    SUB: true,
    SECTION: true,
  };

  let contentTagWhiteList_ = { FORM: true }; //tags that will be converted to DIVs

  let attributeWhitelist_ = {
    class: true,
    id: true,
    'data-source-line': true,
    align: true,
    color: true,
    controls: true,
    height: true,
    href: true,
    src: true,
    style: true,
    target: true,
    title: true,
    alt: true,
    type: true,
    width: true,
    frameborder: true,
    allow: true,
    allowfullscreen: true,
    autoplay: true,
    loop: true,
    muted: true,
  };

  let cssWhitelist_ = {
    color: true,
    "background-color": true,
    "font-size": true,
    "text-align": true,
    "text-decoration": true,
    "font-weight": true,
  };

  let schemaWhiteList_ = [
    "http:",
    "https:",
    "data:",
    "m-files:",
    "file:",
    "ftp:",
  ]; //which "protocols" are allowed in "href", "src" etc

  let uriAttributes_ = { href: true, action: true };

  this.SanitizeHtml = function (input) {
    input = input.trim();
    if (input == "") return ""; //to save performance and not create iframe

    //firefox "bogus node" workaround
    if (input == "<br>") return "";

    let new_div = document.createElement("DIV");
    new_div.style.display = "none";
    document.body.appendChild(new_div); // necessary so the iframe contains a document
    new_div.innerHTML = input;

    function makeSanitizedCopy(node) {
      let newNode;
      if (node.nodeType == Node.TEXT_NODE) {
        newNode = node.cloneNode(true);
      } else if (
        node.nodeType == Node.ELEMENT_NODE &&
        (tagWhitelist_[node.tagName] || contentTagWhiteList_[node.tagName])
      ) {
        //remove useless empty spans (lots of those when pasting from MS Outlook)
        if (
          (node.tagName == "SPAN" ||
            node.tagName == "B" ||
            node.tagName == "I" ||
            node.tagName == "U") &&
          node.innerHTML.trim() == ""
        ) {
          return document.createDocumentFragment();
        }

        if (contentTagWhiteList_[node.tagName])
          newNode = document.createElement("DIV");
        //convert to DIV
        else newNode = document.createElement(node.tagName);

        for (let i = 0; i < node.attributes.length; i++) {
          let attr = node.attributes[i];
          if (attributeWhitelist_[attr.name]) {
            if (attr.name == "style") {
              for (let s = 0; s < node.style.length; s++) {
                let styleName = node.style[s];
                if (cssWhitelist_[styleName])
                  newNode.style.setProperty(
                    styleName,
                    node.style.getPropertyValue(styleName)
                  );
              }
            } else {
              if (uriAttributes_[attr.name]) {
                //if this is a "uri" attribute, that can have "javascript:" or something
                if (
                  attr.value.indexOf(":") > -1 &&
                  !startsWithAny(attr.value, schemaWhiteList_)
                )
                  continue;
              }
              newNode.setAttribute(attr.name, attr.value);
            }
          }
        }
        for (let i = 0; i < node.childNodes.length; i++) {
          let subCopy = makeSanitizedCopy(node.childNodes[i]);
          newNode.appendChild(subCopy, false);
        }
      } else {
        newNode = document.createDocumentFragment();
      }
      return newNode;
    }

    let resultElement = makeSanitizedCopy(new_div);
    document.body.removeChild(new_div);
    return resultElement.innerHTML
      .replace(/<br[^>]*>(\S)/g, "<br>\n$1")
      .replace(/div><div/g, "div>\n<div"); //replace is just for cleaner code
  };

  function startsWithAny(str, substrings) {
    for (let i = 0; i < substrings.length; i++) {
      if (str.indexOf(substrings[i]) == 0) {
        return true;
      }
    }
    return false;
  }

  this.AllowedTags = tagWhitelist_;
  this.AllowedAttributes = attributeWhitelist_;
  this.AllowedCssStyles = cssWhitelist_;
  this.AllowedSchemas = schemaWhiteList_;
})();

export default HtmlSanitizer;
