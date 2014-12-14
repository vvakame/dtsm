/// <reference path="../node_modules/fs-git/fs-git.d.ts" />
/// <reference path="../node_modules/packagemanager-backend/packagemanager-backend.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/insight/insight.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/rimraf/rimraf.d.ts" />

try {
    // optional
    require("source-map-support").install();
} catch (e) {
}
require("es6-promise").polyfill();

export import Tracker = require("./tracker");
export import Manager = require("./manager");

/* tslint:disable:no-unused-variable */
import m = require("./model");
export import Options = m.Options;
export import Recipe = m.Recipe;
export import GlobalConfig = m.GlobalConfig;
/* tslint:enable:no-unused-variable */
