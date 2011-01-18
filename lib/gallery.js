#!/usr/bin/env node

var YUI = require('yui3').YUI,
    Script = process.binding('evals').Script,
    netBinding = process.binding('net'),
    net = require('net'),
    fds = netBinding.socketpair(),
    npm = require('npm'),
    path = require('path'),
    fs = require('fs'),
    exists = path.existsSync,
    config = {
        exit: false,
        loglevel: 'silent',
        outfd: new net.Stream(fds[0], 'unix'),
        logfd: new net.Stream(fds[1], 'unix')
    };


var Y = YUI({ debug: true, logExclude: { yui: true, get: true, loader: true }}).useSync('parallel');

Y.log('Fetching YUI Gallery versions from npm, this may take a moment...', 'info', 'GalleryBuilder');

npm.load(config, function() {
    npm.commands.ls(['yui3-gallery'], function(err, data) {
        var installed = {};
        for (var i in data) {
            if (i.match(/yui3-/)) {
                var versions = data[i].data.versions;
                for (var v in versions) {
                    var m = versions[v];
                    if (m.installed) {
                        installed[v] = true;
                    }
                }
            }
        }
        Y.log('NPM query complete', 'info', 'GalleryBuilder');
        findPaths(Object.keys(installed));
    });
});

var loaderData = {};
var meta = {};

var parse = function(f, version) {
    meta[version] = f.length;
    Y.log('Reading, compiling and parsing data from (' + f.length + ') files in yui3-gallery@' + version, 'info', 'GalleryBuilder');
    f.forEach(function(filename) {
        var data = fs.readFileSync(filename, encoding='utf8');
        var fakeY = {
            YUI: {
                add: function(name, fn, v, d) {
                    if (!loaderData[version]) {
                        loaderData[version] = {};
                    }
                    if (d) {
                        d.fullpath = filename;
                        d.ext = false;
                        d.combine = false;
                        d.name = name;
                        d.type = 'js';
                        loaderData[version][name] = d;
                    }
                }
            }
        };
        Script.runInNewContext(data, fakeY, filename);
    });

    Y.log('Parsing of yui3-gallery@' + version + ' complete.', 'info', 'GalleryBuilder');
}

var findPaths = function(v) {
    Y.log('Finding gallery files for installed versions (' + v.length + ')', 'info', 'GalleryBuilder');
    v.forEach(function(i) {
        var tag = 'yui3-gallery@' + i;
        Y.log('Fetching files for yui3-gallery@' + i, 'info', 'GalleryBuilder');
        var p = path.join(require(tag).path(), 'build');
        Y.log(p, 'info', 'GalleryBuilder');
        var files = fs.readdirSync(p);
        var dirs = [];
        files.forEach(function(f) {
            if (f.indexOf('gallery-') === 0) {
                var dp = path.join(p, f, f + '-min.js');
                if (exists(dp)) {
                    dirs.push(dp);
                }
            }
        });
        parse(dirs, i);
    });
    Y.log('All parsing and compiling complete, saving file.', 'info', 'GalleryBuilder');
    var o = 'exports.Gallery = ' + JSON.stringify(loaderData) + ';';
    fs.writeFile('./out/gallery-meta.js', o, encoding='utf8', function(err) {
        Y.log('Output written: ./out/gallery-meta.js');
    });
    /*
    for (var i in loaderData) {
        console.log(i, meta[i], Object.keys(loaderData[i]).length);
    }
    */
}

