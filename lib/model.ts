import pmb = require("packagemanager-backend");

export interface Console {
    error(message?:any, ...optionalParams:any[]): void;
    warn(message?:any, ...optionalParams:any[]): void;
    log(message?:any, ...optionalParams:any[]): void;
}

export interface Options {
    configPath?:string;
    baseRepo?:string;
    forceOnline?:boolean;
    insightOptout?:boolean;
    logger?: Console;
}

export interface Recipe {
    rootDir?:string;
    baseRepo:string;
    baseRef:string;
    path:string;
    bundle?:string;
    dependencies:{[path:string]:pmb.Dependency};
}

export interface GlobalConfig {
    repositories: {
        [repoName:string]:{
            fetchAt: number; // date time
        }
    };
}
