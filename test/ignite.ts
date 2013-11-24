/// <reference path="../DefinitelyTyped/node.d.ts" />

/// <reference path="../DefinitelyTyped/mocha.d.ts" />
/// <reference path="../DefinitelyTyped/chai.d.ts" />

var expect:chai.Expect = require('chai').expect;

describe("sample", ()=> {
	it("sample", () => {
		expect("hoge").eq("hoge");
	});
});
