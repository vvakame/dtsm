"use strict";

import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as _path from "path";
import * as rimraf from "rimraf";

import * as fsgit from "fs-git";
import * as pmb from "packagemanager-backend";

import * as m from "./model";
import * as utils from "./utils";
import Tracker from "./tracker";

export function createManager(options: m.Options = {}): Promise<Manager> {
    "use strict";

    return new Manager(options)._setupBackend();
}

export default class Manager {
    static defaultConfigFile = process.cwd() + "/dtsm.json";
    static defaultRootDir = "~/.dtsm";
    static defaultRepo = "https://github.com/DefinitelyTyped/DefinitelyTyped.git";
    static defaultRef = "master";
    static defaultPath = "typings";
    static defaultBundleFile = "bundle.d.ts";

    configPath = Manager.defaultConfigFile;
    offline = false;
    rootDir = Manager.defaultRootDir;
    repos: pmb.RepositorySpec[] = [];
    path = Manager.defaultPath;
    bundle = this.path + "/" + Manager.defaultBundleFile;

    backend: pmb.Manager<m.GlobalConfig>;
    tracker: Tracker;
    savedRecipe: m.Recipe;

    constructor(options: m.Options = {}) {
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
            let _recipe: any = this.savedRecipe;
            if (_recipe.baseRepo) {
                let baseRepo: string = _recipe.baseRepo;
                let baseRef: string = _recipe.baseRef;
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

    /** @internal */
    _setupBackend(): Promise<Manager> {
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

    /** @internal */
    _setupDefaultRecipe() {
        this.savedRecipe = this.savedRecipe || <any>{};
        this.savedRecipe.repos = this.savedRecipe.repos || this.repos;
        this.savedRecipe.path = this.savedRecipe.path || this.path;
        this.savedRecipe.bundle = typeof this.savedRecipe.bundle !== "undefined" ? this.savedRecipe.bundle : this.bundle; // for this.recipe.bundle === null
        this.savedRecipe.link = this.savedRecipe.link || {};
        this.savedRecipe.link["npm"] = this.savedRecipe.link["npm"] || { include: true };
        this.savedRecipe.dependencies = this.savedRecipe.dependencies || {};
    }

    init(path: string = this.configPath): string {
        this.tracker.track("init");
        this._setupDefaultRecipe();

        return this._save(path);
    }

    /** @internal */
    _load(path: string = this.configPath): m.Recipe {
        if (fs.existsSync(path)) {
            let recipe: m.Recipe = JSON.parse(fs.readFileSync(path, "utf8"));

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

    /** @internal */
    _save(path: string = this.configPath, recipe: m.Recipe = this.savedRecipe): string {
        let jsonContent = JSON.stringify(recipe, null, 2);

        mkdirp.sync(_path.resolve(path, "../"));
        fs.writeFileSync(path, jsonContent);

        return jsonContent;
    }

    search(phrase: string): Promise<pmb.SearchResult[]> {
        this.tracker.track("search", phrase);
        let promises: Promise<any>[];
        if (this.offline) {
            promises = [Promise.resolve(null)];
        } else {
            promises = this.backend.repos.map(repo => {
                return this._fetchIfOutdated(repo);
            });
        }
        return Promise.all(promises)
            .then(() => {
                return this.backend
                    .search({
                        globPatterns: [
                            "**/*.d.ts",
                            "!_infrastructure/**/*"
                        ]
                    });
            })
            .then((resultList: pmb.SearchResult[]) => resultList.filter(result => result.fileInfo.path.indexOf(phrase) !== -1))
            .then((resultList: pmb.SearchResult[]) => this._addWeightingAndSort(phrase, resultList, v => v.fileInfo.path).map(data => data.result));
    }

    install(opts: { save: boolean; dryRun: boolean; }, phrases: string[]): Promise<pmb.Result> {
        if (phrases) {
            phrases.forEach(phrase=> {
                this.tracker.track("install", phrase);
            });
        }
        if (!this.configPath) {
            return Promise.reject<pmb.Result>("configPath is required");
        }
        if (!fs.existsSync(this.configPath) && opts.save) {
            return Promise.reject<pmb.Result>(this.configPath + " is not exists");
        }
        this._setupDefaultRecipe();

        let promises = phrases.map(phrase => {
            return this.search(phrase).then(resultList => {
                if (resultList.length === 1) {
                    return Promise.resolve(resultList[0]);
                } else if (resultList.length === 0) {
                    return Promise.reject<pmb.SearchResult>(phrase + " is not found");
                } else {
                    let fileInfoWithWeight = this._addWeightingAndSort(phrase, resultList, v => v.fileInfo.path)[0];
                    if (fileInfoWithWeight && fileInfoWithWeight.weight === 1) {
                        return Promise.resolve(fileInfoWithWeight.result);
                    } else {
                        return Promise.reject<pmb.SearchResult>(phrase + " could not be identified. found: " + resultList.length);
                    }
                }
            });
        });
        return Promise.all<pmb.SearchResult>(promises)
            .then((resultList: pmb.SearchResult[]) => {
                if (!opts.save || opts.dryRun) {
                    return resultList;
                }
                resultList.forEach(result => {
                    let depName = result.fileInfo.path;
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
            .then((resultList: pmb.SearchResult[]) => {
                let diff: m.Recipe = {
                    repos: this.savedRecipe.repos,
                    path: this.savedRecipe.path,
                    bundle: this.savedRecipe.bundle,
                    dependencies: {}
                };
                resultList.forEach(result => {
                    let depName = result.fileInfo.path;
                    diff.dependencies[depName] = this.savedRecipe.dependencies[depName] || {
                        repo: result.repo.spec.url,
                        ref: result.fileInfo.ref
                    };
                });
                return this._installFromOptions(diff, opts);
            });
    }

    installFromFile(opts: { dryRun?: boolean; } = {}, retryWithFetch = true): Promise<pmb.Result> {
        if (retryWithFetch) {
            // installFromFile exec recursive, call tracker only once.
            this.tracker.track("installFromFile");
        }

        if (!this.configPath) {
            return Promise.reject<pmb.Result>("configPath is required");
        }
        let content = this._load();
        if (!content) {
            return Promise.reject<pmb.Result>(this.configPath + " is not exists");
        }

        return this._installFromOptions(content, opts)
            .catch(err => {
                // error raised when specified ref is not fetched yet.
                if (retryWithFetch) {
                    return this.fetch().then(() => this.installFromFile(opts, false));
                } else {
                    return Promise.reject<pmb.Result>(err);
                }
            });
    }

    /** @internal */
    _installFromOptions(recipe: m.Recipe, opts: { dryRun?: boolean; } = {}): Promise<pmb.Result> {
        let baseRepo = recipe && recipe.repos && recipe.repos[0] || this.repos[0];
        return this.backend
            .getByRecipe({
                baseRepo: baseRepo.url,
                baseRef: baseRepo.ref,
                path: recipe.path,
                dependencies: recipe.dependencies,
                postProcessForDependency: (result: pmb.Result, depResult: pmb.ResolvedDependency, content: any) => {
                    let dependencies = utils.extractDependencies(content.toString("utf8"));
                    dependencies.forEach(detected => {
                        let obj = result.toDepNameAndPath(detected);
                        result.pushAdditionalDependency(obj.depName, {
                            repo: depResult.repo,
                            ref: depResult.ref,
                            path: obj.path
                        });
                    });
                },
                resolveMissingDependency: (result: pmb.Result, missing: pmb.ResolvedDependency): Promise<pmb.Dependency>=> {
                    if (missing.depth === 1) {
                        return null;
                    }
                    // first, from current process
                    let newDep: pmb.Dependency = result.dependencies[missing.depName];
                    if (newDep) {
                        return Promise.resolve(newDep);
                    }
                    // second, from dtsm.json. can't use this.repos in `dtsm --remote .... install ....` context.
                    if (this.savedRecipe) {
                        newDep = this.savedRecipe.dependencies[missing.depName];
                        let repo = this.savedRecipe.repos[0];
                        if (newDep && repo) {
                            newDep.repo = newDep.repo || repo.url || Manager.defaultRepo;
                            newDep.ref = newDep.ref || repo.ref || Manager.defaultRef;
                        }
                        return Promise.resolve(newDep);
                    }

                    return Promise.resolve(null);
                }
            }).then((result: pmb.Result) => {
                let errors = result.dependenciesList.filter(depResult => !!depResult.error);
                if (errors.length !== 0) {
                    // TODO toString
                    return Promise.reject<pmb.Result>(errors);
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
                    let depPath = _path.join(_path.dirname(this.configPath), this.path, depResult.depName);
                    this._addReferenceToBundle(recipe, depPath);
                });

                return result;
            });
    }

    /** @internal */
    _addWeightingAndSort<T>(phrase: string, list: T[], getPath: (val: T) => string): { weight: number; result: T; }[] {
        // TODO add something awesome weighing algorithm.
        return list
            .map(value => {
                let path = getPath(value);
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

    update(opts: { save?: boolean; dryRun?: boolean }): Promise<pmb.Result> {
        this.tracker.track("update");

        if (!this.configPath) {
            return Promise.reject<pmb.Result>("configPath is required");
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
                    let depResult = result.dependencies[depName];
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

    uninstall(opts: { save?: boolean; dryRun?: boolean }, phrases: string[]): Promise<pmb.ResolvedDependency[]> {
        this.tracker.track("uninstall");

        return this.installFromFile({ dryRun: true }, false)
            .then(result => {
                let topLevelDeps = Object.keys(result.dependencies).map(depName => result.dependencies[depName]);
                if (topLevelDeps.length === 0) {
                    return Promise.reject<pmb.ResolvedDependency[]>("this project doesn't have a dependency tree.");
                }

                let promises = phrases.map(phrase => {
                    let weights = this._addWeightingAndSort(phrase, topLevelDeps, dep => dep.depName);
                    weights = weights.filter(w => w.weight !== 0);
                    if (weights.length === 0) {
                        return Promise.reject<pmb.ResolvedDependency>(phrase + " is not found in config file");
                    }
                    if (weights[0].weight !== 1) {
                        return Promise.reject<pmb.ResolvedDependency>(phrase + " could not be identified. found: " + weights.length);
                    }
                    return Promise.resolve(weights[0].result);
                });
                return Promise.all<pmb.ResolvedDependency>(promises)
                    .then((depList: pmb.ResolvedDependency[]) => {
                        let removeList: pmb.ResolvedDependency[] = [];
                        let addToRemoveList = (dep: pmb.ResolvedDependency) => {
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
                            let unused = result.dependenciesList.every(exDep => exDep.depName !== dep.depName);
                            if (unused) {
                                this._removeDefinitionFile(this.savedRecipe, dep);

                                if (!this.savedRecipe.bundle) {
                                    return;
                                }
                                let depPath = _path.join(_path.dirname(this.configPath), this.path, dep.depName);
                                this._removeReferenceFromBundle(this.savedRecipe, depPath);
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

    link(opts: { save?: boolean; dryRun?: boolean }): Promise<m.LinkResult[]> {
        this.tracker.track("link");

        if (!this.configPath) {
            return Promise.reject<m.LinkResult[]>("configPath is required");
        }
        this._setupDefaultRecipe();
        if (!this.savedRecipe.bundle) {
            return Promise.reject<m.LinkResult[]>("bundle is required");
        }

        let linkInfo = this.savedRecipe.link || {};
        let resultList: m.LinkResult[] = [];
        {
            let depInfo = this._processLink(linkInfo["npm"], "npm", "package.json", "node_modules");
            linkInfo["npm"] = depInfo.link;
            if (!opts || !opts.dryRun) {
                depInfo.results.forEach(r => {
                    r.files.forEach(filePath => {
                        this._addReferenceToBundle(this.savedRecipe, filePath);
                    });
                });
            }
            resultList = resultList.concat(depInfo.results);
        }
        {
            let depInfo = this._processLink(linkInfo["bower"], "bower", "bower.json", "bower_components");
            linkInfo["bower"] = depInfo.link;
            if (!opts || !opts.dryRun) {
                depInfo.results.forEach(r => {
                    r.files.forEach(filePath => {
                        this._addReferenceToBundle(this.savedRecipe, filePath);
                    });
                });
            }
            resultList = resultList.concat(depInfo.results);
        }
        this.savedRecipe.link = linkInfo;
        if (opts && opts.save) {
            this._save();
        }

        return Promise.resolve(resultList);
    }

    /** @internal */
    _processLink(linkInfo: m.Link, managerName: string, configFileName: string, moduleDir: string): { link: m.Link; results: m.LinkResult[]; } {
        if (linkInfo == null) {
            // continue
        } else if (!linkInfo.include) {
            return { link: linkInfo, results: [] };
        }
        linkInfo = linkInfo || { include: true };
        let definitionList: m.LinkResult[] = [];
        let configPath = _path.join(_path.dirname(this.configPath), linkInfo.configPath || configFileName);
        if (!fs.existsSync(configPath)) {
            return { link: linkInfo, results: [] };
        }

        let configData = JSON.parse(fs.readFileSync(configPath, { encoding: "utf8" }));
        ["dependencies", "devDependencies"].forEach(propName => {
            Object.keys(configData[propName] || {}).forEach(depName => {
                let depConfigPath = _path.join(_path.dirname(configPath), moduleDir, depName, configFileName);
                if (!fs.existsSync(depConfigPath)) {
                    return;
                }
                let depConfig = JSON.parse(fs.readFileSync(depConfigPath, { encoding: "utf8" }));
                let definitionInfo = depConfig["typescript"];
                if (!definitionInfo) {
                    return;
                }
                let resultList: string[] = [];
                ["definition", "definitions"].forEach(propName => {
                    if (typeof definitionInfo[propName] === "string") {
                        resultList.push(definitionInfo[propName]);
                    } else if (Array.isArray(definitionInfo[propName])) {
                        resultList = resultList.concat(definitionInfo[propName]);
                    }
                });
                definitionList.push({
                    managerName: managerName,
                    depName: depName,
                    files: resultList.map(filePath => _path.join(_path.dirname(configPath), moduleDir, depName, filePath))
                });
            });
        });

        return { link: linkInfo, results: definitionList };
    }

    /** @internal */
    _writeDefinitionFile(recipe: m.Recipe, depResult: pmb.ResolvedDependency) {
        let path = _path.resolve(_path.dirname(this.configPath), recipe.path, depResult.depName);
        mkdirp.sync(_path.resolve(path, "../"));
        fs.writeFileSync(path, depResult.content.toString("utf8"));
    }

    /** @internal */
    _removeDefinitionFile(recipe: m.Recipe, depResult: pmb.ResolvedDependency) {
        let path = _path.resolve(_path.dirname(this.configPath), recipe.path, depResult.depName);
        try {
            fs.unlinkSync(path);
            let contents = fs.readdirSync(_path.dirname(path));
            if (contents.length === 0) {
                rimraf.sync(_path.dirname(path));
            }
        } catch (e) {
            // suppress error when path is already removed.
        }
    }

    /** @internal */
    _createReferenceComment(bundlePath: string, pathFromCwd: string) {
        let referencePath = _path.relative(_path.dirname(bundlePath), pathFromCwd);
        if (_path.posix) { // for windows
            referencePath = referencePath.replace(new RegExp("\\" + _path.win32.sep, "g"), _path.posix.sep);
        }
        return `/// <reference path="${referencePath}" />` + "\n";
    }

    /** @internal */
    _addReferenceToBundle(recipe: m.Recipe, pathFromCwd: string) {
        let bundleContent = "";
        let bundlePath = _path.join(_path.dirname(this.configPath), recipe.bundle);
        if (fs.existsSync(bundlePath)) {
            bundleContent = fs.readFileSync(bundlePath, "utf8");
        } else {
            mkdirp.sync(_path.dirname(bundlePath));
        }
        let referenceComment = this._createReferenceComment(bundlePath, pathFromCwd);
        if (bundleContent.indexOf(referenceComment) === -1) {
            fs.appendFileSync(bundlePath, referenceComment, { encoding: "utf8" });
        }
    }

    /** @internal */
    _removeReferenceFromBundle(recipe: m.Recipe, pathFromCwd: string) {
        let bundleContent = "";
        let bundlePath = _path.join(_path.dirname(this.configPath), recipe.bundle);
        if (!fs.existsSync(bundlePath)) {
            return;
        }
        bundleContent = fs.readFileSync(bundlePath, "utf8");
        let referenceComment = this._createReferenceComment(bundlePath, pathFromCwd);
        if (bundleContent.indexOf(referenceComment) !== -1) {
            fs.writeFileSync(bundlePath, bundleContent.replace(referenceComment, ''), { encoding: "utf8" });
        }
    }

    refs(): Promise<fsgit.RefInfo[]> {
        let promises: Promise<any>[];
        if (this.offline) {
            promises = [Promise.resolve(null)];
        } else {
            promises = this.backend.repos.map(repo => {
                return this._fetchIfOutdated(repo);
            });
        }
        return Promise.all(promises)
            .then(() => {
                let repo: pmb.Repo = this.backend.repos[0];
                return repo.open().then(fs=> fs.showRef());
            });
    }

    fetch(): Promise<void> {
        this.tracker.track("fetch");
        let promises = this.backend.repos.map(repo => {
            return this._fetchRepo(repo);
        });
        return Promise.all(promises).then(() => <any>null);
    }

    /** @internal */
    _fetchIfOutdated(repo: pmb.Repo): Promise<pmb.Repo> {
        if (this._checkOutdated(repo.spec.url)) {
            return this._fetchRepo(repo);
        } else {
            return Promise.resolve(repo);
        }
    }

    /** @internal */
    _fetchRepo(repo: pmb.Repo): Promise<pmb.Repo> {
        console.log("fetching " + repo.spec.url);
        return Promise
            .resolve(null)
            .then(() => repo.fetchAll())
            .then(() => {
                this._setLastFetchAt(repo.spec.url);
                return repo;
            });
    }

    /** @internal */
    _checkOutdated(repoUrl: string): boolean {
        let fetchAt = this._getLastFetchAt(repoUrl);
        // 15min
        return fetchAt + 15 * 60 * 1000 < Date.now();
    }

    /** @internal */
    _getLastFetchAt(repoID: string): number {
        let config: m.GlobalConfig = this.backend.loadConfig() || <any>{};
        config.repositories = config.repositories || {};
        let repo = config.repositories[repoID] || { fetchAt: null };
        return repo.fetchAt;
    }

    /** @internal */
    _setLastFetchAt(repoID: string, fetchAt: number = Date.now()): void {
        let config: m.GlobalConfig = this.backend.loadConfig() || <any>{};
        config.repositories = config.repositories || {};
        config.repositories[repoID] = {
            fetchAt: fetchAt
        };
        this.backend.saveConfig(config);
    }
}
