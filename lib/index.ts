/// <reference path="../node_modules/packagemanager-backend/packagemanager-backend.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />

try {
    // optional
    require("source-map-support").install();
} catch (e) {
}

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
pmb.search({
    globPatterns: [
        "**/*.d.ts",
        "!_infrastructure/**/*"
    ]
}).then(fileList=> {
    fileList.forEach(fileInfo => console.log(fileInfo.path));
});

export module tmp {
    "use strict";
}
