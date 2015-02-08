<a name="0.5.0"></a>
## 0.5.0 (2015-02-08)


#### Features

* **deps:** add grunt-conventional-changelog ([6c30106a](https://github.com/vvakame/dtsm/commit/6c30106a3aa7d86e167fc4609e80288f359c87c9))
* **dtsm:** add update sub command ([d753cedf](https://github.com/vvakame/dtsm/commit/d753cedfbb92bfcaa17c38947d1bda8fbb88134c))

If you want to update dependencies revision, you can use `dtsm update` or `dtsm update --save`.

The general procedure.

```
$ dtsm update
...omitted...
$ npm run test
...omitted...
$ echo $?
0
$ dtsm update --save
$ git status -s
 M dtsm.json
```
