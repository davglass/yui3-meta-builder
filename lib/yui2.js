#!/usr/bin/env node

var YUI = require('yui3').YUI,
    Script = process.binding('evals').Script,
    netBinding = process.binding('net'),
    net = require('net'),
    fds = netBinding.socketpair(),
    npm = require('npm'),
    path = require('path'),
    fs = require('fs'),
    exists = path.existsSync;


var Y = YUI({ debug: true, logExclude: { yui: true, get: true, loader: true }}).useSync('parallel');


var loaderData = {};
var meta = {};

var parse = function(f, version) {
    Y.log('Reading, compiling and parsing data from (' + f.length + ') files in yui3-2in3@' + version, 'info', 'GalleryBuilder');
    f.forEach(function(filename) {
        var data = fs.readFileSync(filename, encoding='utf8');
        var fakeY = {
            YUI: {
                add: function(name, fn, v, d) {
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

    Y.log('Parsing of yui3-2in3@' + version + ' complete.', 'info', 'GalleryBuilder');
}

var findPaths = function(v) {
    Y.log('Finding 2in3 files for installed versions', 'info', 'GalleryBuilder');
    var tag = 'yui3-2in3';
    Y.log('Fetching files for yui3-2in3', 'info', 'GalleryBuilder');
    var p = path.join(require(tag).path(), 'dist');
    Y.log(p, 'info', 'GalleryBuilder');
    var files = fs.readdirSync(p);
    files.forEach(function(f) {
        if (f.indexOf('.') > 0) {
            var version = f;
            loaderData[version] = {};
            f = path.join(p, f, 'build');
            var dirs = fs.readdirSync(f);
            var ds = [];
            meta[version] = 0;
            dirs.forEach(function(d) {
                var file = path.join(f, d, d + '-min.js');
                if (exists(file)) {
                    meta[version]++;
                    ds.push(file);
                } else {
                    file = path.join(f, d, d + '-min.css');
                    if (exists(file)) {
                        meta[version]++;
                        loaderData[version][d] = {
                            name: d,
                            fullpath: file,
                            type: 'css'
                        }
                    }
                }
            });
            parse(ds, version);
        }
    });
    
    Y.log('All parsing and compiling complete, saving file.', 'info', 'GalleryBuilder');
    var o = 'exports.YUI2 = ' + JSON.stringify(loaderData) + ';';
    fs.writeFile('./out/2in3-meta.js', o, encoding='utf8', function(err) {
        Y.log('Output written: ./out/2in3-meta.js');
    });
    /*
    for (var i in loaderData) {
        console.log(i, meta[i], Object.keys(loaderData[i]).length);
    }
    */
}


findPaths([ '0.0.3' ]);

