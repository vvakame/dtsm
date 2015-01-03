import utils = require("../lib/utils");

describe("utils", ()=> {
    describe("extractDependencies", ()=> {
        it("extract dependencies", ()=> {
            var src = "/// <reference path='../q/Q.d.ts' />";
            var deps = utils.extractDependencies(src);

            assert(deps.length === 1);
            assert(deps[0] === "../q/Q.d.ts");
        });
        it("extract from minimal space syntax", ()=> {
            // test for https://github.com/vvakame/dtsm/issues/2
            var src = "///<reference path='../q/Q.d.ts'/>";
            var deps = utils.extractDependencies(src);

            assert(deps.length === 1);
            assert(deps[0] === "../q/Q.d.ts");
        });
        it("extract from waste space syntax", ()=> {
            var src = "///    <reference    path  =    '../q/Q.d.ts'    />";
            var deps = utils.extractDependencies(src);

            assert(deps.length === 1);
            assert(deps[0] === "../q/Q.d.ts");
        });
    });
});
