/// <reference path="../node_modules/fs-git/fs-git.d.ts" />
/// <reference path="../node_modules/packagemanager-backend/packagemanager-backend.d.ts" />

/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/mkdirp/mkdirp.d.ts" />
/// <reference path="../typings/rimraf/rimraf.d.ts" />

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

interface IRecipe {
    baseRepo:string;
    baseRef:string;
    path:string;
    dependencies:{[path:string]:_pmb.PackageManagerBackend.IDependency};
}

export function init(path:string):string {
    "use strict";

    var content = load(path);
    content = content || <any>{};
    content.baseRepo = content.baseRepo || "https://github.com/borisyankov/DefinitelyTyped.git";
    content.baseRef = content.baseRef || "master";
    content.path = content.path || "typings";
    content.dependencies = content.dependencies || {};

    return save(path, content);
}

function load(path:string):IRecipe {
    "use strict";

    var recipe:IRecipe;

    if (fs.existsSync(path)) {
        recipe = JSON.parse(fs.readFileSync(path, "utf8"));
    }
    return recipe;
}

function save(path:string, recipe:IRecipe):string {
    "use strict";

    var jsonContent = JSON.stringify(recipe, null, 2);

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
    }).then(fileList=> {
        var reorderedList:fsgit.IFileInfo[] = [];
        fileList = fileList.sort((a, b) => a.path.length - b.path.length);
        // exact match
        fileList.forEach(fileInfo => {
            if (fileInfo.path === phrase) {
                reorderedList.push(fileInfo);
            }
        });
        // library name match
        fileList.forEach(fileInfo => {
            if (fileInfo.path === phrase + "/" + phrase + ".d.ts" && reorderedList.indexOf(fileInfo) === -1) {
                reorderedList.push(fileInfo);
            }
        });
        // .d.t.s file match
        fileList.forEach(fileInfo => {
            if (fileInfo.path.indexOf("/" + phrase + ".d.ts") !== -1 && reorderedList.indexOf(fileInfo) === -1) {
                reorderedList.push(fileInfo);
            }
        });
        // directory name match
        fileList.forEach(fileInfo => {
            if (fileInfo.path.indexOf(phrase + "/") === 0 && reorderedList.indexOf(fileInfo) === -1) {
                reorderedList.push(fileInfo);
            }
        });

        // junk
        fileList.forEach(fileInfo => {
            if (reorderedList.indexOf(fileInfo) === -1) {
                reorderedList.push(fileInfo);
            }
        });

        return reorderedList;
    });
}

export function install(opts:{path:string; save:boolean;}, phrases:string[]):Promise<_pmb.PackageManagerBackend.IResult> {
    "use strict";

    if (!opts.path) {
        return Promise.reject("path is required");
    }
    var content = load(opts.path);
    if (!content && opts.save) {
        return Promise.reject(opts.path + " is not exists");
    }

    var promises = phrases.map(phrase => {
        return search(phrase).then(fileList => {
            if (fileList.length === 1 && !opts.save) {
                return Promise.resolve(fileList[0]);
            } else if (fileList.length === 1) {
                var fileInfo = fileList[0];
                content.dependencies[fileInfo.path] = {
                    ref: fileInfo.ref // TODO expend ref
                };
                save(opts.path, content);
                return Promise.resolve(fileList[0]);
            } else {
                return Promise.reject(phrase + " could not be identified. found: " + fileList.length);
            }
        });
    });
    return Promise.all(promises)
        .then((fileList:fsgit.IFileInfo[])=> {
            content = content || <any>{};
            content.baseRepo = content.baseRepo || "https://github.com/borisyankov/DefinitelyTyped.git";
            content.baseRef = content.baseRef || "master";
            content.path = content.path || "typings";
            content.dependencies = content.dependencies || {};
            var diff:IRecipe = {
                baseRepo: content.baseRepo,
                baseRef: content.baseRef,
                path: content.path,
                dependencies: {}
            };
            fileList.forEach(fileInfo => {
                diff.dependencies[fileInfo.path] = {
                    ref: fileInfo.ref // TODO expend ref
                };
            });
            return installFromOptions(diff);
        });
}

export function installFromFile(path:string):Promise<_pmb.PackageManagerBackend.IResult> {
    "use strict";

    if (!path) {
        return Promise.reject("path is required");
    }
    var content = load(path);
    if (!content) {
        return Promise.reject(path + " is not exists");
    }

    return installFromOptions(content);
}

function installFromOptions(recipe:IRecipe):Promise<_pmb.PackageManagerBackend.IResult> {
    "use strict";

    return pmb.getByRecipe({
        baseRepo: recipe.baseRepo,
        baseRef: recipe.baseRef,
        path: recipe.path,
        dependencies: recipe.dependencies,
        postProcessForDependency: (recipe, dep, content) => {
            var reference = /\/\/\/\s+<reference\s+path=["']([^"']*)["']\s*\/>/;
            var body:string = content.toString("utf8");
            body
                .split("\n")
                .map(line => line.match(reference))
                .filter(matches => !!matches)
                .forEach(matches => {
                    pmb.pushAdditionalDependency(recipe, dep, matches[1]);
                });
        }
    }).then(result => {
        var errors:any[] = Object.keys(result.dependencies).map(depName => {
            var depResult = result.dependencies[depName];
            return depResult.error;
        }).filter(error => !!error);
        if (errors.length !== 0) {
            // TODO toString
            return Promise.reject(errors);
        }

        Object.keys(result.dependencies).forEach(depName => {
            var dep = result.recipe.dependencies[depName];
            var depResult = result.dependencies[depName];

            var path = _path.resolve(recipe.path, dep.path);
            mkdirp.sync(_path.resolve(path, "../"));
            fs.writeFileSync(path, depResult.content.toString("utf8"));
        });

        return Promise.resolve(result);
    });
}

export function uninstall(opts:{path:string; save:boolean;}, phrase:string):Promise<fsgit.IFileInfo[]> {
    "use strict";

    return null;
}

export function outdated():Promise<fsgit.IFileInfo[]> {
    "use strict";

    return null;
}

export function fetch():Promise<void> {
    "use strict";

    return pmb
        .fetch("https://github.com/borisyankov/DefinitelyTyped.git")
        .then(repo => repo.gitFetchAll())
        .then(()=> Promise.resolve(<any>null));
}
