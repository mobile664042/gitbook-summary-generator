var dir = require('node-dir');
var TreeModel = require('tree-model');
var treeModel = new TreeModel();
var _ = require('lodash');
var fs = require('fs')
var lineReader = require('line-reader');
const program = require('commander');
program
    .version('0.1.0')
    .option('-b, --book [book]', '', process.cwd())
    .option('-s, --summary [summary]', '', process.cwd() + '/SUMMARY.md')
    .parse(process.argv);

let bookDir = program.book;
let summaryFilePath = program.summary;

const basePath = process.cwd();

if (bookDir.indexOf(basePath) === -1 ) { 
    bookDir = `${basePath}/${bookDir}`;
}

if (summaryFilePath.indexOf(basePath) === -1 ) { 
    summaryFilePath = `${basePath}/${summaryFilePath}`;
}

bookDir = bookDir.replace(/\//g,'\\');
summaryFilePath = summaryFilePath.replace(/\//g,'\\');

console.log(bookDir)
console.log(summaryFilePath)

dir.paths(bookDir, function (err, paths) {
    if (err) throw err;
    const allFile = paths.files
        .map(file => ({ isDir: false, path: file }))
        .concat(paths.dirs.map(dir => ({ isDir: true, path: dir })));

    let oTree = treeModel.parse({ name: 'root', children: [], data: { path: bookDir, isDir: true, level: 0 } });
    while (allFile.length) {
        oTree = _.reduce(allFile,
            putBack,
            oTree)
    }

    Promise.all(oTree.all().map(revampNode))
        .then(d => {
            const summaryText = _.reduce(oTree.all(), (result, current) => {
                return result.concat(toSummarryText(current.model.data));
            }, []).join('\r');
            fs.writeFileSync(summaryFilePath, summaryText, 'utf-8');
            console.log(`Created ${summaryFilePath}`)
        });

    function toSummarryText(data) {
        if (data.isDir) {
            const summaryLine = `${toTab(data.fileLevel)}* [${pathToTitle(data.path)}](${data.path})`;
            return [summaryLine];
        }
        if (data.levelTextArray && data.levelTextArray.length) {
            return data.levelTextArray.map((lt) => {
                const ltTitle = titleToTitle(lt.title);
                const summaryLine = `${toTab(data.fileLevel, lt.level)}* [${ltTitle}](${ltTitle})`;
                return summaryLine;
            })
        }
        return []
    }

    function toTab(fileLevel, level = 0) {
        return _.repeat('\t', fileLevel + level);
    }

    function pathToTitle(path) {
        return _.last(path.split('\\')).replace(/.md/, '').trim();
    }

    /** 
     * @param title title here 
     * */
    function titleToTitle(title) {
        return title.replace(/#/g, '').trim();
    }

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

function getFileLevel(ROOT_DIR, current) {
    const relateivePath = current.path.replace(ROOT_DIR, '');
    const level = relateivePath ? relateivePath.match(/\\/g).length : 0;
    console.log(`>>> ${current.path} has dir level:${level}`);
    return level;
}
const TITLE_REGEX = /^#*\s/;
function revampNode(node) {
    return new Promise((resolve, reject) => {
        if (node.model.data.isDir || !node.model.data.path.endsWith('.md') || node.model.data.path.endsWith('\\READNE.md'))
            resolve();

        const fileLevel = getFileLevel(bookDir, node.model.data);
        node.model.data.fileLevel = fileLevel;
        let levelCount = {};
        let lastLevel = 0;
        lineReader.eachLine(node.model.data.path, function (line, last) {
            const matched = _.get(line.match(TITLE_REGEX), [0], '').trim();
            if (matched) {
                const level = matched.length - 1;
                if (level < lastLevel)
                    levelCount[lastLevel] = 0;

                if (levelCount[level])
                    levelCount[level].count = levelCount[level].count + 1;
                else
                    levelCount[level] = { count: 0 };

                const levelText = { level: level, title: line };

                if (node.model.data.levelTextArray)
                    node.model.data.levelTextArray.push(levelText);
                else
                    node.model.data.levelTextArray = [levelText];

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
