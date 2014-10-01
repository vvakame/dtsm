/// <reference path="../node_modules/packagemanager-backend/packagemanager-backend.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />

try {
    // optional
    require("source-map-support").install();
} catch (e) {
}

import fsgit = require("fs-git"); // only types, do not emit.
import _pmb = require("packagemanager-backend");

var pmb = new _pmb.PackageManagerBackend({
    rootDir: "~/.dtsm",
    offlineFirst: true,
    repos: [
        {
            url: "https://github.com/borisyankov/DefinitelyTyped.git",
            ref: "master"
        }
    ]
});

export function init(path:string):void {
    "use strict";
}

export function search(phrase:string):Promise<fsgit.IFileInfo[]> {
    "use strict";

    return pmb.search({
        globPatterns: [
            "**/*.d.ts",
            "!_infrastructure/**/*"
        ]
    }).then(fileList=> {
        return fileList.filter(fileInfo => fileInfo.path.indexOf(phrase) !== -1);
    });
}

export function install(opts:{save:boolean;}, phrase:string):Promise<fsgit.IFileInfo[]> {
    "use strict";

    return null;
}

export function uninstall(opts:{save:boolean;}, phrase:string):Promise<fsgit.IFileInfo[]> {
    "use strict";

    return null;
}

export function outdated():Promise<fsgit.IFileInfo[]> {
    "use strict";

    return null;
}
