export function deepClone(obj:any) {
    "use strict";

    if (obj == null) {
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map((obj:any)=> deepClone(obj));
    } else if (obj instanceof RegExp) {
        return obj;
    } else if (typeof obj === "object") {
        var cloned:any = {};
        Object.keys(obj).forEach(key=> cloned[key] = deepClone(obj[key]));
        return cloned;
    } else {
        return obj;
    }
}

export function extractDependencies(sourceCode:string):string[] {
    "use strict";

    var referenceRegExp = /^\/\/\/\s*<reference\s+path\s*=\s*("|')(.+?)\1.*?\/>/;
    return sourceCode
        .split("\n")
        .map(line => line.match(referenceRegExp))
        .filter(matches => !!matches)
        .map(matches => matches[2]);
}

export function padString(str:string, length:number, pad = " "):string {
    "use strict";

    var shortage = length - str.length;
    for (var i = 0; i < shortage; i++) {
        str += pad;
    }
    return str;
}
