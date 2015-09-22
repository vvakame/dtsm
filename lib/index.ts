"use strict";

/// <reference path="../node_modules/fs-git/fs-git.d.ts" />
/// <reference path="../node_modules/packagemanager-backend/packagemanager-backend.d.ts" />

export import Tracker = require("./tracker");

/* tslint:disable:no-unused-variable */
import ma = require("./manager");
export import createManager = ma.createManager;
export import Manager = ma.Manager;
/* tslint:enable:no-unused-variable */

/* tslint:disable:no-unused-variable */
import m = require("./model");
export import Options = m.Options;
export import Recipe = m.Recipe;
export import Link = m.Link;
export import LinkResult = m.LinkResult;
export import GlobalConfig = m.GlobalConfig;
/* tslint:enable:no-unused-variable */
