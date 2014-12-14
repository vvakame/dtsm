import fs = require("fs");
import mkdirp = require("mkdirp");
import _path = require("path");

import fsgit = require("fs-git");
import pmb = require("packagemanager-backend");

import m = require("./model");
import Tracker = require("./tracker");

class Manager {

    static createManager(options:m.Options = {}):Promise<Manager> {
        return new Manager(options).setupBackend();
    }

    configPath = "dtsm.json";
    forceOnline = false;
    rootDir = "~/.dtsm";
    baseRepo = "https://github.com/borisyankov/DefinitelyTyped.git";
    baseRef = "master";
    path = "typings";
    bundle = this.path + "/bundle.d.ts";

    otherBaseRepo = false;

    backend:pmb.Manager<m.GlobalConfig>;
    tracker:Tracker;

    constructor(public options:m.Options = {}) {
        this.configPath = options.configPath || this.configPath;
        this.baseRepo = options.baseRepo || this.baseRepo;
        this.forceOnline = options.forceOnline || this.forceOnline;
        this.tracker = new Tracker();
        if (typeof options.insightOptout !== "undefined") {
            this.tracker.optOut = options.insightOptout;
        }
        if (this.tracker.optOut === false) {
            this.tracker.track();
        }

        var recipe = this._load(this.configPath);
        if (recipe && recipe.baseRepo !== this.baseRepo) {
            // if recipe's baseRepo and command-line option's baseRepo is not match, some actions are limeted.
            this.otherBaseRepo = true;
        }
        if (!options.baseRepo) {
            if (recipe) {
                this.rootDir = recipe.rootDir || this.rootDir;
                this.baseRepo = recipe.baseRepo || this.baseRepo;
                this.baseRef = recipe.baseRef || this.baseRef;
                this.path = recipe.path || this.path;
            }
        }
        if (!options.logger) {
            options.logger = {
                error: console.error.bind(console),
                warn: console.warn.bind(console),
                log: () => {
                }
            };
        }
    }

    setupBackend():Promise<Manager> {
        return pmb.Manager
            .createManager<m.GlobalConfig>({
            rootDir: this.rootDir,
            repos: [
                {
                    url: this.baseRepo,
                    ref: this.baseRef
                }
            ]
        })
            .then(backend => {
                this.backend = backend;
                return this;
            });
    }

    init(path:string = this.configPath):string {
        this.tracker.track("init");
        var content = this._load(path);
        content = content || <any>{};
        content.baseRepo = content.baseRepo || this.baseRepo;
        content.baseRef = content.baseRef || this.baseRef;
        content.path = content.path || this.path;
        content.bundle = typeof content.bundle !== "undefined" ? content.bundle : this.bundle; // for content.bundle === null
        content.dependencies = content.dependencies || {};

        return this._save(path, content);
    }

    _load(path:string):m.Recipe {
        if (fs.existsSync(path)) {
            return JSON.parse(fs.readFileSync(path, "utf8"));
        } else {
            return null;
        }
    }

    _save(path:string, recipe:m.Recipe):string {
        var jsonContent = JSON.stringify(recipe, null, 2);

        mkdirp.sync(_path.resolve(path, "../"));
        fs.writeFileSync(path, jsonContent);

        return jsonContent;
    }

    search(phrase:string):Promise<pmb.SearchResult[]> {
        this.tracker.track("search", phrase);
        return this.backend
            .search({
                globPatterns: [
                    "**/*.d.ts",
                    "!_infrastructure/**/*"
                ]
            })
            .then((resultList:pmb.SearchResult[])=> resultList.filter(result => result.fileInfo.path.indexOf(phrase) !== -1))
            .then((resultList:pmb.SearchResult[])=> this._addWeightingAndSort(phrase, resultList).map(data => data.result));
    }

    install(opts:{save:boolean;dryRun:boolean;}, phrases:string[]):Promise<pmb.Result> {
        if (phrases) {
            phrases.forEach(phrase=> {
                this.tracker.track("install", phrase);
            });
        }
        if (!this.configPath) {
            return Promise.reject("path is required");
        }
        var content = this._load(this.configPath);
        if (!content && opts.save) {
            return Promise.reject(this.configPath + " is not exists");
        }

        var promises = phrases.map(phrase => {
            return this.search(phrase).then(resultList => {
                if (resultList.length === 1) {
                    return Promise.resolve(resultList[0]);
                } else if (resultList.length === 0) {
                    return Promise.reject(phrase + " is not found");
                } else {
                    var fileInfoWithWeight = this._addWeightingAndSort(phrase, resultList)[0];
                    if (fileInfoWithWeight && fileInfoWithWeight.weight === 1) {
                        return Promise.resolve(fileInfoWithWeight.result);
                    } else {
                        return Promise.reject(phrase + " could not be identified. found: " + resultList.length);
                    }
                }
            });
        });
        return Promise.all(promises)
            .then((resultList:pmb.SearchResult[])=> {
                if (!opts.save || opts.dryRun) {
                    return resultList;
                }
                resultList.forEach(result => {
                    var fileInfo = result.fileInfo;
                    if (content.dependencies[fileInfo.path]) {
                        return;
                    }
                    content.dependencies[fileInfo.path] = {
                        repo: this.otherBaseRepo ? this.baseRepo : void 0,
                        ref: fileInfo.ref
                    };
                });
                this._save(this.configPath, content);

                return resultList;
            })
            .then((resultList:pmb.SearchResult[])=> {
                content = content || <any>{};
                content.baseRepo = this.baseRepo;
                content.baseRef = this.baseRef;
                content.path = this.path;
                content.dependencies = content.dependencies || {};
                var diff:m.Recipe = {
                    baseRepo: content.baseRepo,
                    baseRef: content.baseRef,
                    path: content.path,
                    bundle: content.bundle,
                    dependencies: {}
                };
                resultList.forEach(result => {
                    var fileInfo = result.fileInfo;
                    diff.dependencies[fileInfo.path] = content.dependencies[fileInfo.path] || {
                        ref: fileInfo.ref
                    };
                });
                return this._installFromOptions(diff, opts);
            });
    }

    installFromFile(opts:{dryRun?:boolean;} = {}):Promise<pmb.Result> {
        this.tracker.track("installFromFile");

        if (this.otherBaseRepo) {
            return Promise.reject("do not install from file with --remote option");
        }

        if (!this.configPath) {
            return Promise.reject("configPath is required");
        }
        var content = this._load(this.configPath);
        if (!content) {
            return Promise.reject(this.configPath + " is not exists");
        }

        return this._installFromOptions(content, opts);
    }

    _installFromOptions(recipe:m.Recipe, opts:{dryRun?:boolean;} = {}):Promise<pmb.Result> {
        return this.backend
            .getByRecipe({
                baseRepo: recipe.baseRepo,
                baseRef: recipe.baseRef,
                path: recipe.path,
                dependencies: recipe.dependencies,
                postProcessForDependency: (recipe:pmb.Recipe, dep:pmb.Dependency, content:any) => {
                    var reference = /\/\/\/\s+<reference\s+path=["']([^"']*)["']\s*\/>/;
                    var body:string = content.toString("utf8");
                    body
                        .split("\n")
                        .map(line => line.match(reference))
                        .filter(matches => !!matches)
                        .forEach(matches => {
                            this.backend.pushAdditionalDependency(recipe, dep, matches[1]);
                        });
                }
            }).then((result:pmb.Result) => {
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
                    if (!opts.dryRun) {
                        mkdirp.sync(_path.resolve(path, "../"));
                        fs.writeFileSync(path, depResult.content.toString("utf8"));
                        if (!recipe.bundle) {
                            return;
                        }
                        var bundleContent = "";
                        if (fs.existsSync(recipe.bundle)) {
                            bundleContent = fs.readFileSync(recipe.bundle, "utf8");
                        } else {
                            mkdirp.sync(_path.resolve(recipe.bundle, "../"));
                        }
                        var referencePath = _path.relative(_path.resolve(recipe.bundle, "../"), _path.resolve(recipe.path, depName));
                        var referenceComment = "/// <reference path=\"" + referencePath + "\" />\n";
                        if (bundleContent.indexOf(referenceComment) === -1) {
                            fs.appendFileSync(recipe.bundle, referenceComment, {encoding: "utf8"});
                        }
                    }
                });

                return Promise.resolve(result);
            });
    }

    _addWeightingAndSort(phrase:string, resultList:pmb.SearchResult[]):{weight: number; result:pmb.SearchResult;}[] {
        // TODO add something awesome weighing algorithm.
        return resultList
            .map(result => {
                var fileInfo = result.fileInfo;
                // exact match
                if (fileInfo.path === phrase) {
                    return {
                        weight: 1,
                        result: result
                    };
                }

                // library name match
                if (fileInfo.path === phrase + "/" + phrase + ".d.ts") {
                    return {
                        weight: 1,
                        result: result
                    };
                }

                // .d.t.s file match
                if (fileInfo.path.indexOf("/" + phrase + ".d.ts") !== -1) {
                    return {
                        weight: 0.9,
                        result: result
                    };
                }

                // directory name match
                if (fileInfo.path.indexOf(phrase + "/") === 0) {
                    return {
                        weight: 0.8,
                        result: result
                    };
                }

                // junk
                return {
                    weight: 0.0,
                    result: result
                };
            })
            .sort((a, b) => b.weight - a.weight);
    }

    uninstall(opts:{path:string; save:boolean;}, phrase:string):Promise<fsgit.FileInfo[]> {
        // TODO
        return null;
    }

    outdated():Promise<fsgit.FileInfo[]> {
        // TODO
        return null;
    }

    fetch():Promise<void> {
        this.tracker.track("fetch");
        return this.backend
            .fetchAllRepos()
            .then(()=> {
                this.backend.repos.forEach((repo:pmb.Repo) => this._setLastFetchAt(repo.spec.url));
                return Promise.resolve(<any>null);
            });
    }

    checkOutdated(callback:(outdated:boolean)=>void) {
        var fetchAt = this._getLastFetchAt(this.baseRepo);
        var now = new Date().getTime();
        callback(fetchAt < (now - 3 * 24 * 60 * 1000));
    }

    _getLastFetchAt(repoID:string):number {
        var config:m.GlobalConfig = this.backend.loadConfig() || <any>{};
        config.repositories = config.repositories || {};
        var repo = config.repositories[repoID] || {fetchAt: null};
        return repo.fetchAt;
    }

    _setLastFetchAt(repoID:string, fetchAt:number = new Date().getTime()):void {
        var config:m.GlobalConfig = this.backend.loadConfig() || <any>{};
        config.repositories = config.repositories || {};
        config.repositories[repoID] = {
            fetchAt: fetchAt
        };
        this.backend.saveConfig(config);
    }
}

export = Manager;
