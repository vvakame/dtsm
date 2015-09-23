"use strict";

import Insight = require("insight");
let pkg = require("../package.json");

export default class Tracker {
    insight: Insight;

    constructor() {
        this.insight = new Insight({
            // Google Analytics tracking code
            trackingCode: "UA-6628015-5",
            packageName: pkg.name,
            packageVersion: pkg.version
        });
    }

    set optOut(val: boolean) {
        this.insight.config.set('optOut', val);
    }

    get optOut(): boolean {
        return this.insight.optOut;
    }

    askPermissionIfNeeded(): Promise<void> {
        if (typeof this.optOut === "undefined") {
            return new Promise((resolve: (value?: any) => void, reject: (error: any) => void) => {
                this.insight.askPermission(null, () => {
                    resolve();
                });
            });
        } else {
            return Promise.resolve(<any>null);
        }
    }

    track(...args: string[]) {
        this.insight.track.apply(this.insight, args);
    }
}
