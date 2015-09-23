"use strict";

import * as pmb from "packagemanager-backend";

export interface Console {
    error(message?:any, ...optionalParams:any[]): void;
    warn(message?:any, ...optionalParams:any[]): void;
    log(message?:any, ...optionalParams:any[]): void;
}

export interface Options {
    configPath?:string;
    repos?:pmb.RepositorySpec[];
    offline?:boolean;
    insightOptout?:boolean;
}

export interface Recipe {
    rootDir?:string;
    repos?:pmb.RepositorySpec[];
    path:string;
    bundle?:string;
    link?: { [name:string]: Link; };
    dependencies:{ [path:string]:pmb.Dependency; };
}

export interface Link {
    include?: boolean;
    configPath?: string; // e.g. "./package.json",
}

export interface LinkResult {
    managerName: string;
    depName: string;
    files: string[];
}

export interface GlobalConfig {
    repositories: {
        [repoName:string]:{
            fetchAt: number; // date time
        }
    };
}
