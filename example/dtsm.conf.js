module.exports = function (config) {
    config.set({
        "dependencies": {
            "jquery": {},
            "breeze": {
                "version": "0123456789abcdef",
                "files": "breeze-1.0.d.ts"
            },
            "angular": {
                "files": "angular-*.d.ts",
                "filter": function (fileName) {
                    return true;
                },
                "rename": function (path) {
                    return path;
                }
            },
            "three.js": {
                "repo": "https://github.com/kontan/three.d.ts.git",
                "filter": function () {

                }
            },
            "popcornjs": "git@github.com:grapswiz/popcorn-js.git"
        },
        "devDependencies": {
            "jasmine": {},
            "angular-mocks": {}
        }
    });
}
