var debugFlag = false;

export function debug(...args:any[]) {
    "use strict";

    if (debugFlag) {
        console.log.apply(console, args);
    }
}

export function extend(dest:any, ...sources:any[]) {
    "use strict";

    sources.forEach(source => {
        for (var key in source) {
            dest[key] = source[key];
        }
    });
    return dest;
}

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
