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

export interface IOptions {
    configPath?:string;
    track?:(...args:string[])=>void;
}

export interface IRecipe {
    rootDir?:string;
    baseRepo:string;
    baseRef:string;
    path:string;
    dependencies:{[path:string]:_pmb.PackageManagerBackend.IDependency};
}

export class Manager {

    configPath = "dtsm.json";
    rootDir = "~/.dtsm";
    baseRepo = "https://github.com/borisyankov/DefinitelyTyped.git";
    baseRef = "master";
    path = "typings";

    pmb:_pmb.PackageManagerBackend;
    track:(...args:string[])=>void = ()=> {
    };

    constructor(public options?:IOptions) {
        if (options) {
            this.configPath = options.configPath || this.configPath;
            this.track = options.track || this.track;
        }
        this.track();

        var recipe = this.load(this.configPath);
        if (recipe) {
            this.rootDir = recipe.rootDir || this.rootDir;
            this.baseRepo = recipe.baseRepo || this.baseRepo;
            this.baseRef = recipe.baseRef || this.baseRef;
            this.path = recipe.path || this.path;
        }

        this.pmb = new _pmb.PackageManagerBackend({
            rootDir: this.rootDir,
            offlineFirst: true,
            repos: [
                {
                    url: this.baseRepo,
                    ref: this.baseRef
                }
            ]
        });
    }

    init(path:string = this.configPath):string {
        var content = this.load(path);
        content = content || <any>{};
        content.baseRepo = content.baseRepo || this.baseRepo;
        content.baseRef = content.baseRef || this.baseRef;
        content.path = content.path || this.path;
        content.dependencies = content.dependencies || {};

        return this.save(path, content);
    }

    load(path:string):IRecipe {
        if (fs.existsSync(path)) {
            return JSON.parse(fs.readFileSync(path, "utf8"));
        } else {
            return null;
        }
    }

    save(path:string, recipe:IRecipe):string {
        var jsonContent = JSON.stringify(recipe, null, 2);

        mkdirp.sync(_path.resolve(path, "../"));
        fs.writeFileSync(path, jsonContent);

        return jsonContent;
    }

    search(phrase:string):Promise<fsgit.IFileInfo[]> {
        return this.pmb.search({
            globPatterns: [
                "**/*.d.ts",
                "!_infrastructure/**/*"
            ]
        })
            .then(fileList=> fileList.filter(fileInfo => fileInfo.path.indexOf(phrase) !== -1))
            .then(fileList=> this._addWeightingAndSort(phrase, fileList).map(data => data.file));
    }

    install(opts:{save:boolean;}, phrases:string[]):Promise<_pmb.PackageManagerBackend.IResult> {
        if (!this.configPath) {
            return Promise.reject("path is required");
        }
        var content = this.load(this.configPath);
        if (!content && opts.save) {
            return Promise.reject(this.configPath + " is not exists");
        }

        var promises = phrases.map(phrase => {
            return this.search(phrase).then(fileList => {
                if (fileList.length === 1) {
                    return Promise.resolve(fileList[0]);
                } else if (fileList.length === 0) {
                    return Promise.reject(phrase + " is not found");
                } else {
                    var fileInfoWithWeight = this._addWeightingAndSort(phrase, fileList)[0];
                    if (fileInfoWithWeight && fileInfoWithWeight.weight === 1) {
                        return Promise.resolve(fileInfoWithWeight.file);
                    } else {
                        return Promise.reject(phrase + " could not be identified. found: " + fileList.length);
                    }
                }
            });
        });
        return Promise.all(promises)
            .then((fileList:fsgit.IFileInfo[])=> {
                if (!opts.save) {
                    return fileList;
                }
                fileList.forEach(fileInfo => {
                    if (content.dependencies[fileInfo.path]) {
                        return;
                    }
                    content.dependencies[fileInfo.path] = {
                        ref: fileInfo.ref
                    };
                });
                this.save(this.configPath, content);

                return fileList;
            })
            .then((fileList:fsgit.IFileInfo[])=> {
                content = content || <any>{};
                content.baseRepo = content.baseRepo || this.baseRepo;
                content.baseRef = content.baseRef || this.baseRef;
                content.path = content.path || this.path;
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
                return this._installFromOptions(diff);
            });
    }

    installFromFile(path = this.configPath):Promise<_pmb.PackageManagerBackend.IResult> {
        "use strict";

        if (!path) {
            return Promise.reject("path is required");
        }
        var content = this.load(path);
        if (!content) {
            return Promise.reject(path + " is not exists");
        }

        return this._installFromOptions(content);
    }

    _installFromOptions(recipe:IRecipe):Promise<_pmb.PackageManagerBackend.IResult> {
        return this.pmb.getByRecipe({
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
                        this.pmb.pushAdditionalDependency(recipe, dep, matches[1]);
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
                var depResult = result.dependencies[depName];

                var path = _path.resolve(recipe.path, depName);
                mkdirp.sync(_path.resolve(path, "../"));
                fs.writeFileSync(path, depResult.content.toString("utf8"));
            });

            return Promise.resolve(result);
        });
    }

    _addWeightingAndSort(phrase:string, fileList:fsgit.IFileInfo[]):{weight: number; file:fsgit.IFileInfo;}[] {
        // TODO add something awesome weighing algorithm.
        return fileList.map(fileInfo => {
            // exact match
            if (fileInfo.path === phrase) {
                return {
                    weight: 1,
                    file: fileInfo
                };
            }

            // library name match
            if (fileInfo.path === phrase + "/" + phrase + ".d.ts") {
                return {
                    weight: 1,
                    file: fileInfo
                };
            }

            // .d.t.s file match
            if (fileInfo.path.indexOf("/" + phrase + ".d.ts") !== -1) {
                return {
                    weight: 0.9,
                    file: fileInfo
                };
            }

            // directory name match
            if (fileInfo.path.indexOf(phrase + "/") === 0) {
                return {
                    weight: 0.8,
                    file: fileInfo
                };
            }

            // junk
            return {
                weight: 0.0,
                file: fileInfo
            };
        }).sort((a, b) => b.weight - a.weight);
    }

    uninstall(opts:{path:string; save:boolean;}, phrase:string):Promise<fsgit.IFileInfo[]> {
        // TODO
        return null;
    }

    outdated():Promise<fsgit.IFileInfo[]> {
        // TODO
        return null;
    }

    fetch():Promise<void> {
        return this.pmb
            .fetch(this.baseRepo)
            .then(repo => repo.gitFetchAll())
            .then(()=> Promise.resolve(<any>null));
    }
}
