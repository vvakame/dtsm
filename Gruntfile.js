module.exports = function (grunt) {
    require("time-grunt")(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        opt: {
            client: {
                "tsMain": "lib",
                "tsTest": "test",

                "jsMainOut": "lib",
                "jsTestOut": "test"
            }
        },

        ts: {
            options: {
                compile: true,                 // perform compilation. [true (default) | false]
                comments: false,               // same as !removeComments. [true | false (default)]
                target: 'es5',                 // target javascript language. [es3 (default) | es5]
                module: 'commonjs',            // target javascript module style. [amd (default) | commonjs]
                noImplicitAny: true,
                sourceMap: true,              // generate a source map for every output js file. [true (default) | false]
                sourceRoot: '',                // where to locate TypeScript files. [(default) '' == source ts location]
                mapRoot: '',                   // where to locate .map.js files. [(default) '' == generated js location.]
                declaration: false             // generate a declaration .d.ts file for every output js file. [true | false (default)]
            },
            clientMain: {
                src: ['<%= opt.client.tsMain %>/cli.ts'],
                out: '<%= opt.client.jsMainOut %>/cli.js',
                options: {
                    declaration: true
                }
            },
            clientTest: {
                src: ['<%= opt.client.tsTest %>/index_spec.ts'],
                out: '<%= opt.client.jsTestOut %>/index_spec.js'
            }
        },
        tslint: {
            options: {
                configuration: grunt.file.readJSON("tslint.json")
            },
            files: {
                src: [
                    '<%= opt.client.tsMain %>/**/*.ts',
                    '<%= opt.client.tsTest %>/**/*.ts',
                    '!<%= opt.client.tsMain %>/**/*.d.ts'
                ]
            }
        },
        typedoc: {
            main: {
                options: {
                    module: "<%= ts.options.module %>",
                    out: './docs',
                    name: '<%= pkg.name %>',
                    target: "<%= ts.options.target %>"
                },
                src: [
                    '<%= opt.client.tsMain %>/**/*.ts'
                ]
            }
        },
        tsd: {
            client: {
                options: {
                    // execute a command
                    command: 'reinstall',

                    //optional: always get from HEAD
                    latest: false,

                    // optional: specify config file
                    config: './tsd.json'
                }
            }
        },
        clean: {
            clientScript: {
                src: [
                    // client
                    '<%= opt.client.jsMainOut %>/*.js',
                    '<%= opt.client.jsMainOut %>/*.d.ts',
                    '<%= opt.client.jsMainOut %>/*.js.map',
                    '!<%= opt.client.jsMainOut %>/insight.d.ts',
                    // client test
                    '<%= opt.client.jsTestOut %>/*.js',
                    '<%= opt.client.jsTestOut %>/*.js.map',
                    '<%= opt.client.jsTestOut %>/*.d.ts',
                    // peg.js
                    '<%= opt.client.peg %>/grammar.js'
                ]
            },
            tsd: {
                src: [
                    // tsd installed
                    "d.ts/",
                    '<%= opt.client.tsMain %>/libs/DefinitelyTyped',
                    '<%= opt.client.tsTest %>/libs/DefinitelyTyped'
                ]
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    timeout: 20000,
                    require: [
                        function () {
                            require('espower-loader')({
                                cwd: process.cwd() + '/' + grunt.config.get("opt.client.jsTestOut"),
                                pattern: '**/*.js'
                            });
                        },
                        function () {
                            assert = require('power-assert');
                        }
                    ]
                },
                src: [
                    '<%= opt.client.jsTestOut %>/**/*_spec.js'
                ]
            }
        }
    });

    grunt.registerTask(
        'setup',
        ['clean', 'tsd']);

    grunt.registerTask(
        'default',
        ['ts:clientMain', 'tslint']);

    grunt.registerTask(
        'test',
        ['default', 'ts:clientTest', 'mochaTest']);

    require('load-grunt-tasks')(grunt);
};
