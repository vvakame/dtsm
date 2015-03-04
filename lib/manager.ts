import fs = require("fs");
import mkdirp = require("mkdirp");
import _path = require("path");
import rimraf = require("rimraf");

import fsgit = require("fs-git");
import pmb = require("packagemanager-backend");

import m = require("./model");
import utils = require("./utils");
import Tracker = require("./tracker");

export function createManager(options:m.Options = {}):Promise<Manager> {
    "use strict";

    return new Manager(options)._setupBackend();
}

export class Manager {
    static defaultConfigFile = process.cwd() + "/dtsm.json";
    static defaultRootDir = "~/.dtsm";
    static defaultRepo = "https://github.com/borisyankov/DefinitelyTyped.git";
    static defaultRef = "master";
    static defaultPath = "typings";
    static defaultBundleFile = "bundle.d.ts";

    configPath = Manager.defaultConfigFile;
    offline = false;
    rootDir = Manager.defaultRootDir;
    repos:pmb.RepositorySpec[] = [];
    path = Manager.defaultPath;
    bundle = this.path + "/" + Manager.defaultBundleFile;

    backend:pmb.Manager<m.GlobalConfig>;
    tracker:Tracker;
    savedRecipe:m.Recipe;

    constructor(options:m.Options = {}) {
        options = utils.deepClone(options);

        this.configPath = options.configPath || this.configPath;
        this.repos = options.repos || this.repos;
        this.repos = this.repos.map(repo => repo); // copy
        if (this.repos.length === 0) {
            this.repos.push({
                url: Manager.defaultRepo,
                ref: Manager.defaultRef
            });
        }
        if (!this.repos[0].url) {
            this.repos[0].url = Manager.defaultRepo;
        }
        this.offline = options.offline || this.offline;
        this.tracker = new Tracker();
        if (typeof options.insightOptout !== "undefined") {
            this.tracker.optOut = options.insightOptout;
        }
        if (this.tracker.optOut === false) {
            this.tracker.track();
        }

        this.savedRecipe = this._load();
        if (this.savedRecipe) {
            // for backward compatible
            var _recipe:any = this.savedRecipe;
            if (_recipe.baseRepo) {
                var baseRepo:string = _recipe.baseRepo;
                var baseRef:string = _recipe.baseRef;
                delete _recipe.baseRepo;
                delete _recipe.baseRef;
                this.savedRecipe.repos = this.savedRecipe.repos || [];
                this.savedRecipe.repos.unshift({
                    url: baseRepo,
                    ref: baseRef
                });
            }

            // for options
            if (this.repos.length === 0) {
                this.repos = this.savedRecipe.repos;
            } else if (options.repos && options.repos.length === 0) {
                this.repos = this.savedRecipe.repos;
            }
            this.rootDir = this.savedRecipe.rootDir || this.rootDir;
            this.path = this.savedRecipe.path || this.path;
        }
    }

    _setupBackend():Promise<Manager> {
        return pmb.Manager
            .createManager<m.GlobalConfig>({
            rootDir: this.rootDir,
            repos: this.repos
        })
            .then(backend => {
                this.backend = backend;
                return this;
            });
    }

    _setupDefaultRecipe() {
        this.savedRecipe = this.savedRecipe || <any>{};
        this.savedRecipe.repos = this.savedRecipe.repos || this.repos;
        this.savedRecipe.path = this.savedRecipe.path || this.path;
        this.savedRecipe.bundle = typeof this.savedRecipe.bundle !== "undefined" ? this.savedRecipe.bundle : this.bundle; // for this.recipe.bundle === null
        this.savedRecipe.dependencies = this.savedRecipe.dependencies || {};
    }

    init(path:string = this.configPath):string {
        this.tracker.track("init");
        this._setupDefaultRecipe();

        return this._save(path);
    }

    _load(path:string = this.configPath):m.Recipe {
        if (fs.existsSync(path)) {
            var recipe:m.Recipe = JSON.parse(fs.readFileSync(path, "utf8"));

            // backward compatible
            if (!recipe.repos || recipe.repos.length === 0) {
                recipe.repos = [{
                    url: (<any>recipe).baseRepo,
                    ref: (<any>recipe).baseRef
                }];
            }
            delete (<any>recipe).baseRepo;
            delete (<any>recipe).baseRef;
            return recipe;
        } else {
            return null;
        }
    }

    _save(path:string = this.configPath, recipe:m.Recipe = this.savedRecipe):string {
        var jsonContent = JSON.stringify(recipe, null, 2);

        mkdirp.sync(_path.resolve(path, "../"));
        fs.writeFileSync(path, jsonContent);

        return jsonContent;
    }

    search(phrase:string):Promise<pmb.SearchResult[]> {
        this.tracker.track("search", phrase);
        var promises:Promise<any>[];
        if (this.offline) {
            promises = [Promise.resolve(null)];
        } else {
            promises = this.backend.repos.map(repo => {
                return this._fetchIfOutdated(repo);
            });
        }
        return Promise.all(promises)
            .then(()=> {
                return this.backend
                    .search({
                        globPatterns: [
                            "**/*.d.ts",
                            "!_infrastructure/**/*"
                        ]
                    });
            })
            .then((resultList:pmb.SearchResult[])=> resultList.filter(result => result.fileInfo.path.indexOf(phrase) !== -1))
            .then((resultList:pmb.SearchResult[])=> this._addWeightingAndSort(phrase, resultList, v => v.fileInfo.path).map(data => data.result));
    }

    install(opts:{save:boolean;dryRun:boolean;}, phrases:string[]):Promise<pmb.Result> {
        if (phrases) {
            phrases.forEach(phrase=> {
                this.tracker.track("install", phrase);
            });
        }
        if (!this.configPath) {
            return Promise.reject("configPath is required");
        }
        if (!fs.existsSync(this.configPath) && opts.save) {
            return Promise.reject(this.configPath + " is not exists");
        }
        this._setupDefaultRecipe();

        var promises = phrases.map(phrase => {
            return this.search(phrase).then(resultList => {
                if (resultList.length === 1) {
                    return Promise.resolve(resultList[0]);
                } else if (resultList.length === 0) {
                    return Promise.reject(phrase + " is not found");
                } else {
                    var fileInfoWithWeight = this._addWeightingAndSort(phrase, resultList, v => v.fileInfo.path)[0];
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
                    var depName = result.fileInfo.path;
                    if (this.savedRecipe.dependencies[depName]) {
                        return;
                    }
                    this.savedRecipe.dependencies[depName] = {
                        repo: result.repo.spec.url,
                        ref: result.fileInfo.ref
                    };
                    if (this.savedRecipe) {
                        if (this.savedRecipe.repos && this.savedRecipe.repos[0].url === this.savedRecipe.dependencies[depName].repo) {
                            delete this.savedRecipe.dependencies[depName].repo;
                        }
                    }
                });
                this._save();

                return resultList;
            })
            .then((resultList:pmb.SearchResult[])=> {
                var diff:m.Recipe = {
                    repos: this.savedRecipe.repos,
                    path: this.savedRecipe.path,
                    bundle: this.savedRecipe.bundle,
                    dependencies: {}
                };
                resultList.forEach(result => {
                    var depName = result.fileInfo.path;
                    diff.dependencies[depName] = this.savedRecipe.dependencies[depName] || {
                        repo: result.repo.spec.url,
                        ref: result.fileInfo.ref
                    };
                });
                return this._installFromOptions(diff, opts);
            });
    }

    installFromFile(opts:{dryRun?:boolean;} = {}, retryWithFetch = true):Promise<pmb.Result> {
        if (retryWithFetch) {
            // installFromFile exec recursive, call tracker only once.
            this.tracker.track("installFromFile");
        }

        if (!this.configPath) {
            return Promise.reject("configPath is required");
        }
        var content = this._load();
        if (!content) {
            return Promise.reject(this.configPath + " is not exists");
        }

        return this._installFromOptions(content, opts)
            .catch(err => {
                // error raised when specified ref is not fetched yet.
                if (retryWithFetch) {
                    return this.fetch().then(()=> this.installFromFile(opts, false));
                } else {
                    return Promise.reject(err);
                }
            });
    }

    _installFromOptions(recipe:m.Recipe, opts:{dryRun?:boolean;} = {}):Promise<pmb.Result> {
        var baseRepo = recipe && recipe.repos && recipe.repos[0] || this.repos[0];
        return this.backend
            .getByRecipe({
                baseRepo: baseRepo.url,
                baseRef: baseRepo.ref,
                path: recipe.path,
                dependencies: recipe.dependencies,
                postProcessForDependency: (result:pmb.Result, depResult:pmb.ResolvedDependency, content:any) => {
                    var dependencies = utils.extractDependencies(content.toString("utf8"));
                    dependencies.forEach(detected => {
                        var obj = result.toDepNameAndPath(detected);
                        result.pushAdditionalDependency(obj.depName, {
                            repo: depResult.repo,
                            ref: depResult.ref,
                            path: obj.path
                        });
                    });
                },
                resolveMissingDependency: (result:pmb.Result, missing:pmb.ResolvedDependency):Promise<pmb.Dependency>=> {
                    if (missing.depth === 1) {
                        return null;
                    }
                    // first, from current process
                    var newDep:pmb.Dependency = result.dependencies[missing.depName];
                    if (newDep) {
                        return Promise.resolve(newDep);
                    }
                    // second, from dtsm.json. can't use this.repos in `dtsm --remote .... install ....` context.
                    if (this.savedRecipe) {
                        newDep = this.savedRecipe.dependencies[missing.depName];
                        var repo = this.savedRecipe.repos[0];
                        if (newDep && repo) {
                            newDep.repo = newDep.repo || repo.url || Manager.defaultRepo;
                            newDep.ref = newDep.ref || repo.ref || Manager.defaultRef;
                        }
                        return Promise.resolve(newDep);
                    }

                    return Promise.resolve(null);
                }
            }).then((result:pmb.Result) => {
                var errors = result.dependenciesList.filter(depResult => !!depResult.error);
                if (errors.length !== 0) {
                    // TODO toString
                    return Promise.reject(errors);
                }

                if (opts.dryRun) {
                    return result;
                }

                // create definition files and bundle file
                result.dependenciesList.forEach(depResult => {
                    this._writeDefinitionFile(recipe, depResult);

                    if (!recipe.bundle) {
                        return;
                    }
                    this._addReferenceToBundle(recipe, depResult.depName);
                });

                return result;
            });
    }

    _addWeightingAndSort<T>(phrase:string, list:T[], getPath:(val:T)=>string):{weight: number; result:T;}[] {
        // TODO add something awesome weighing algorithm.
        return list
            .map(value => {
                var path = getPath(value);
                // exact match
                if (path === phrase) {
                    return {
                        weight: 1,
                        result: value
                    };
                }

                // library name match
                if (path === phrase + "/" + phrase + ".d.ts") {
                    return {
                        weight: 1,
                        result: value
                    };
                }

                // .d.t.s file match
                if (path.indexOf("/" + phrase + ".d.ts") !== -1) {
                    return {
                        weight: 0.9,
                        result: value
                    };
                }

                // directory name match
                if (path.indexOf(phrase + "/") === 0) {
                    return {
                        weight: 0.8,
                        result: value
                    };
                }

                // junk
                return {
                    weight: 0.0,
                    result: value
                };
            })
            .sort((a, b) => b.weight - a.weight);
    }

    update(opts:{save?:boolean;dryRun?:boolean}):Promise<pmb.Result> {
        this.tracker.track("update");

        if (!this.configPath) {
            return Promise.reject("configPath is required");
        }
        this._setupDefaultRecipe();

        // reset ref settings
        Object.keys(this.savedRecipe.dependencies).map(depName => {
            this.savedRecipe.dependencies[depName].ref = null;
        });

        return this._installFromOptions(this.savedRecipe, opts)
            .then(result => {
                if (opts.dryRun) {
                    return result;
                }

                Object.keys(result.dependencies).forEach(depName => {
                    var depResult = result.dependencies[depName];
                    this._writeDefinitionFile(this.savedRecipe, depResult);
                    if (this.savedRecipe.dependencies[depName]) {
                        this.savedRecipe.dependencies[depName].ref = depResult.fileInfo.ref;
                    }
                });
                if (opts.save) {
                    this._save();
                }
                return result;
            });
    }

    uninstall(opts:{save?:boolean;dryRun?:boolean}, phrases:string[]):Promise<pmb.ResolvedDependency[]> {
        this.tracker.track("uninstall");

        return this.installFromFile({dryRun: true}, false)
            .then(result => {
                var topLevelDeps = Object.keys(result.dependencies).map(depName => result.dependencies[depName]);
                if (topLevelDeps.length === 0) {
                    return Promise.reject("this project doesn't have a dependency tree.");
                }

                var promises = phrases.map(phrase => {
                    var weights = this._addWeightingAndSort(phrase, topLevelDeps, dep => dep.depName);
                    weights = weights.filter(w => w.weight !== 0);
                    if (weights.length === 0) {
                        return Promise.reject(phrase + " is not found in config file");
                    }
                    if (weights[0].weight !== 1) {
                        return Promise.reject(phrase + " could not be identified. found: " + weights.length);
                    }
                    return Promise.resolve(weights[0].result);
                });
                return Promise.all(promises)
                    .then((depList:pmb.ResolvedDependency[])=> {
                        var removeList:pmb.ResolvedDependency[] = [];
                        var addToRemoveList = (dep:pmb.ResolvedDependency) => {
                            if (!dep) {
                                return;
                            }
                            if (removeList.filter(rmDep => rmDep.depName === dep.depName).length !== 0) {
                                return;
                            }
                            removeList.push(dep);
                            if (!dep.dependencies) {
                                return;
                            }
                            Object.keys(dep.dependencies).forEach(depName => {
                                addToRemoveList(dep.dependencies[depName]);
                            });
                        };
                        depList.forEach(dep => {
                            // always remove from top level.
                            delete this.savedRecipe.dependencies[dep.depName];
                            delete result.dependencies[dep.depName];

                            addToRemoveList(dep);
                        });

                        if (opts.dryRun) {
                            return depList;
                        }

                        removeList.forEach(dep => {
                            var unused = result.dependenciesList.every(exDep => exDep.depName !== dep.depName);
                            if (unused) {
                                this._removeDefinitionFile(this.savedRecipe, dep);
                            }
                        });

                        if (!opts.save) {
                            return depList;
                        }

                        this._save();

                        return depList;
                    });
            });
    }

    _writeDefinitionFile(recipe:m.Recipe, depResult:pmb.ResolvedDependency) {
        var path = _path.resolve(_path.dirname(this.configPath), recipe.path, depResult.depName);
        mkdirp.sync(_path.resolve(path, "../"));
        fs.writeFileSync(path, depResult.content.toString("utf8"));
    }

    _removeDefinitionFile(recipe:m.Recipe, depResult:pmb.ResolvedDependency) {
        var path = _path.resolve(_path.dirname(this.configPath), recipe.path, depResult.depName);
        try {
            fs.unlinkSync(path);
            var contents = fs.readdirSync(_path.dirname(path));
            if (contents.length === 0) {
                rimraf.sync(_path.dirname(path));
            }
        } catch (e) {
            // suppress error when path is already removed.
        }
    }

    _addReferenceToBundle(recipe:m.Recipe, depName:string) {
        var bundleContent = "";
        var bundlePath = _path.resolve(_path.dirname(this.configPath), recipe.bundle);
        if (fs.existsSync(bundlePath)) {
            bundleContent = fs.readFileSync(bundlePath, "utf8");
        } else {
            mkdirp.sync(_path.resolve(bundlePath, "../"));
        }
        var referencePath = _path.relative(_path.resolve(recipe.bundle, "../"), _path.resolve(recipe.path, depName));
        var referenceComment = "/// <reference path=\"" + referencePath + "\" />\n";
        if (bundleContent.indexOf(referenceComment) === -1) {
            fs.appendFileSync(bundlePath, referenceComment, {encoding: "utf8"});
        }
    }

    refs():Promise<fsgit.RefInfo[]> {
        var promises:Promise<any>[];
        if (this.offline) {
            promises = [Promise.resolve(null)];
        } else {
            promises = this.backend.repos.map(repo => {
                return this._fetchIfOutdated(repo);
            });
        }
        return Promise.all(promises)
            .then(()=> {
                var repo:pmb.Repo = this.backend.repos[0];
                return repo.open().then(fs=> fs.showRef());
            });
    }

    fetch():Promise<void> {
        this.tracker.track("fetch");
        var promises = this.backend.repos.map(repo => {
            return this._fetchRepo(repo);
        });
        return Promise.all(promises).then(()=> <any>null);
    }

    _fetchIfOutdated(repo:pmb.Repo) {
        if (this._checkOutdated(repo.spec.url)) {
            return this._fetchRepo(repo);
        } else {
            return Promise.resolve(repo);
        }
    }

    _fetchRepo(repo:pmb.Repo) {
        console.log("fetching " + repo.spec.url);
        return Promise
            .resolve(null)
            .then(()=> repo.fetchAll())
            .then(()=> {
                this._setLastFetchAt(repo.spec.url);
                return repo;
            });
    }

    _checkOutdated(repoUrl:string):boolean {
        var fetchAt = this._getLastFetchAt(repoUrl);
        // 15min
        return fetchAt + 15 * 60 * 1000 < Date.now();
    }

    _getLastFetchAt(repoID:string):number {
        var config:m.GlobalConfig = this.backend.loadConfig() || <any>{};
        config.repositories = config.repositories || {};
        var repo = config.repositories[repoID] || {fetchAt: null};
        return repo.fetchAt;
    }

    _setLastFetchAt(repoID:string, fetchAt:number = Date.now()):void {
        var config:m.GlobalConfig = this.backend.loadConfig() || <any>{};
        config.repositories = config.repositories || {};
        config.repositories[repoID] = {
            fetchAt: fetchAt
        };
        this.backend.saveConfig(config);
    }
}
