var dir = require('node-dir');
var TreeModel = require('tree-model');
var treeModel = new TreeModel();
var _ = require('lodash');
var fs = require('fs')
var lineReader = require('line-reader');

dir.paths(__dirname, function (err, paths) {
    if (err) throw err;

    const allFile = paths.files.map(f => ({ isDir: false, path: f })).concat(paths.dirs.map(f => ({ isDir: true, path: f })));
    let oTree = treeModel.parse({ name: 'root', children: [], data: { path: __dirname, isDir: true } });
    while (allFile.length) {
        oTree = _.reduce(allFile,
            putBack,
            oTree)
    }

    Promise.all(oTree.all().map(setTitles))
        .then(d => {
            oTree.all().forEach(d => {
                
                console.log(JSON.stringify(d.model.data));
            })
        });

    function putBack(tree, current) {
        if (!current)
            return tree;
        tree.walk(node => {
            if (node.model.data.isDir && isParentDir(node.model.data.path, current.path)) {
                node.addChild(treeModel.parse({ name: current.path, data: { path: current.path, isDir: current.isDir } }))
                _.pull(allFile, current);
            }
        });
        return tree;
    }
});
const TITLE_REGEX = /^#*\s/;
function setTitles(d) {
    return new Promise((resolve, reject) => {
        if (d.model.data.isDir || !d.model.data.path.endsWith('.md') || d.model.data.path.endsWith('\\READNE.md'))
            resolve();

        let levelCount = {};
        let lastLevel = 0;
        lineReader.eachLine(d.model.data.path, function (line, last) {
            const matched = _.get(line.match(TITLE_REGEX), [0], '').trim();
            if (matched) {
                const level = matched.length - 1;
                if (level < lastLevel)
                    levelCount[lastLevel] = 0;

                if (levelCount[level])
                    levelCount[level].count = levelCount[level].count + 1;
                else
                    levelCount[level] = { count: 0 };

                const levelText = line.replace(TITLE_REGEX, `${level}.${levelCount[level].count} `)
                
                if (d.model.data.levelTextArray)
                    d.model.data.levelTextArray.push(levelText);
                else
                    d.model.data.levelTextArray = [levelText];

                // if (d.model.data.path.endsWith('RMOD.md'))
                //console.log(d.model.data.levelText)

                lastLevel = level;
            }
            if (last)
                resolve()
        });
    });
}

function splitFileAndDir(file) {
    return {
        filename: file.split('\\').reverse()[0],
        dir: file.substring(0, file.length - name.length - 1)
    };
}

function isParentDir(parentPath, testPath) {
    const t = testPath.split('\\');
    t.pop();
    const currentPath = t.join('\\');
    return currentPath === parentPath
}
