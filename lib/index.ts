/// <reference path="../node_modules/fs-git/fs-git.d.ts" />
/// <reference path="../node_modules/packagemanager-backend/packagemanager-backend.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/mkdirp/mkdirp.d.ts" />

try {
    // optional
    require("source-map-support").install();
} catch (e) {
}

import fs = require("fs");
import mkdirp = require("mkdirp");
import _path = require("path");

import fsgit = require("fs-git");
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

export function init(path:string):string {
    "use strict";

    var content:any; // TODO type annotation

    if (fs.existsSync(path)) {
        content = JSON.parse(fs.readFileSync(path, "utf8"));
    }

    content = content || {};
    content.baseRepo = content.baseRepo || "https://github.com/borisyankov/DefinitelyTyped.git";
    content.baseRef = content.baseRef || "master";
    content.path = content.path || "typings";
    content.dependencies = content.dependencies || {};

    var jsonContent = JSON.stringify(content, null, 2);

    mkdirp.sync(_path.resolve(path, "../"));
    fs.writeFileSync(path, jsonContent);

    return jsonContent;
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
