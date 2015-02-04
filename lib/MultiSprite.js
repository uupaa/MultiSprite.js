(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

//var TEXTURE_SIZE = 2048; // OpenGLES 2.0 spec, see http://answers.unity3d.com/questions/563094/mobile-max-texture-size.html

// --- class / interfaces ----------------------------------
function MultiSprite() {
    this._maps          = [];  // 32 x 32 grids. [Uint32Array(32), ...]
    this._ctxs          = [];  // sprite sheets(canvas) contexts. [ctx, ...]
    this._spriteSheets  = [];  // sprite sheets(canvas). [HTMLCanvasElement, ...]
    this._imageData     = {};  // image data. { key: { ssn, sw, sh, bx, by, bw, bh }, ... }
                               //       ssn: spriteSheetNumber
                               //       sw:  sourceImageWidth
                               //       sh:  sourceImageHeight
                               //       bx:  block x
                               //       by:  block y
                               //       bw:  block width
                               //       bh:  block height
}

MultiSprite["VERBOSE"] = false;
MultiSprite["VERBOSE_VERBOSE"] = false;
MultiSprite["prototype"]["has"]    = MultiSprite_has;    // MultiSprite#has(key:String):Boolean
MultiSprite["prototype"]["get"]    = MultiSprite_get;    // MultiSprite#get(key:String):Object
MultiSprite["prototype"]["add"]    = MultiSprite_add;    // MultiSprite#add(key:String, image:HTMLImageElement|HTMLCanvasElement, sx:UINT16 = 0, sy:UINT16 = 0, sw:UINT16 = image.width, sh:UINT = image.height):void
MultiSprite["prototype"]["draw"]   = MultiSprite_draw;   // MultiSprite#draw(key:String, ctx:CanvasRenderingContext2D, dx:UINT16, dy:UINT16, dw:UINT16, dh:UINT16):void
MultiSprite["prototype"]["keys"]   = MultiSprite_keys;   // MultiSprite#keys():KeyStringArray
MultiSprite["prototype"]["remove"] = MultiSprite_remove; // MultiSprite#remove(key:String):void
MultiSprite["prototype"]["clear"]  = MultiSprite_clear;  // MultiSprite#clear():void
// --- Utility ---
MultiSprite["prototype"]["dump"]   = MultiSprite_dump;   // MultiSprite#dump(ssn:SpriteSheetNumber = undefined):void
MultiSprite["imageLoader"]         = MultiSprite_imageLoader; // MultiSprite.imageLoader(resource:Array, finished:Function, fail:Function = null, progress:Function = null):void

// --- implements ------------------------------------------
function MultiSprite_draw(key,  // @arg String
                          ctx,  // @arg CanvasRenderingContext2D
                          dx,   // @arg UINT16
                          dy,   // @arg UINT16
                          dw,   // @arg UINT16 = sourceImage.width
                          dh) { // @arg UINT16 = sourceImage.height
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(key, "String"),      MultiSprite_draw, "key");
        $valid($type(ctx, "CanvasRenderingContext2D"), MultiSprite_draw, "ctx");
        $valid($type(dx,  "UINT16"),      MultiSprite_draw, "dx");
        $valid($type(dy,  "UINT16"),      MultiSprite_draw, "dy");
        $valid($type(dw,  "UINT16|omit"), MultiSprite_draw, "dw");
        $valid($type(dh,  "UINT16|omit"), MultiSprite_draw, "dh");
    }
//}@dev

    var data = this._imageData[key]; // { ssn, sw, sh, bx, by, bw, bh }
    if (data) {
        dw = dw || data.sw;
        dh = dh || data.sh;

        ctx.drawImage(this._spriteSheets[data.ssn],
                      data.bx * 64, data.by * 64, data.sw, data.sh,
                      dx, dy, dw, dh);
    }
}

function MultiSprite_has(key) { // @arg String
                                // @ret Boolean
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(key, "String"), MultiSprite_has, "key");
    }
//}@dev

    return !!this._imageData[key];
}

function MultiSprite_get(key) { // @arg String
                                // @ret { ssn:MultiSpriteNumber, x:UINT16, y:UINT16, w:UINT16, h:UINT16 };
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(key, "String"), MultiSprite_get, "key");
    }
//}@dev

    var data = this._imageData[key]; // { ssn, sw, sh, bx, by, bw, bh }
    if (data) {
        return {
            "ssn": data.ssn,
            "x":   data.bx * 64,
            "y":   data.by * 64,
            "w":   data.sw,
            "h":   data.sh
        };
    }
    return null;
}

function MultiSprite_add(key,    // @arg String
                         image,  // @arg HTMLImageElement|HTMLCanvasElement
                         sx,     // @arg UINT16 = 0 - source x
                         sy,     // @arg UINT16 = 0 - source y
                         sw,     // @arg UINT16 = image.width  - source w
                         sh) {   // @arg UINT16 = image.height - source h
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(key,   "String"),      MultiSprite_add, "key");
        $valid($type(image, "HTMLImageElement|HTMLCanvasElement"), MultiSprite_add, "image");
        $valid($type(sx,    "UINT16|omit"), MultiSprite_add, "sx");
        $valid($type(sy,    "UINT16|omit"), MultiSprite_add, "sy");
        $valid($type(sw,    "UINT16|omit"), MultiSprite_add, "sw");
        $valid($type(sh,    "UINT16|omit"), MultiSprite_add, "sh");
    }
//}@dev

    if (key in this._imageData) { // already exists.
        return;
    }

    sx = sx || 0;
    sy = sy || 0;
    sw = sw || (image instanceof HTMLImageElement  ? image.naturalWidth :
                image instanceof HTMLCanvasElement ? image.width : 0);
    sh = sh || (image instanceof HTMLImageElement  ? image.naturalHeight :
                image instanceof HTMLCanvasElement ? image.height : 0);

    var bw  = ((sw % 64 === 0) ? sw : (((sw >>> 6) + 1) << 6)) >>> 6; // to block width
    var bh  = ((sh % 64 === 0) ? sh : (((sh >>> 6) + 1) << 6)) >>> 6; // to block height

    var pos = _findFreeSpace(this, bw, bh); // { ssn, bx, by }
    if (!pos) {
        pos = { ssn: _addSpriteSheet(this), bx: 0, by: 0 };
    }
    var ssn = pos.ssn;
    var bx  = pos.bx;
    var by  = pos.by;

    this._imageData[key] = { ssn: ssn, sw: sw, sh: sh,
                                       bx: bx, by: by, bw: bw, bh: bh };
    _mapping(this._maps[ssn], bx, by, bw, bh);
    this._ctxs[ssn].drawImage(image, sx, sy, sw, sh, bx * 64, by * 64, sw, sh);
}
function _findFreeSpace(that, bw, bh) { // @ret Object - { ssn, bx, by }
    var maps = that._maps;

    for (var ssn = 0, sz = that._spriteSheets.length; ssn < sz; ++ssn) {
        var map = maps[ssn];

        for (var by = 0; by < 32 && by + bh <= 32; ++by) {
            var line = map[by]; // UINT32
            var pops = _getPopulationCount(line);

            if (pops + bw <= 32) {
                for (var bx = 0; bx < 32 && bx + bw <= 32; ++bx) {
                    // https://gist.github.com/uupaa/6a9094089783e02c2218
                    var bits = (0xFFFFFFFF << (32 - bw)) >>> bx; // 0b0011110000....
                    var a = (line ^ bits) >>> 0;
                    var b = (line | bits) >>> 0;

                    if (a === b) { // found the pit in this line and below.
                        var ok = true;

                        for (var y = by + 1, yz = y + bh; y < yz && ok; ++y) {
                            a = (map[y] ^ bits) >>> 0;
                            b = (map[y] | bits) >>> 0;
                            ok = a === b;
                        }
                        if (ok) {
                            return { ssn: ssn, bx: bx, by: by };
                        }
                    }
                }
            }
        }
    }
    return null; // not found
}
function _addSpriteSheet(that) { // @ret UINT8 - new sprite sheet number.
    var canvas = document.createElement("canvas");
    canvas.width  = 2048;
    canvas.height = 2048;

    var ssn = that._spriteSheets.push(canvas) - 1; // sprite sheet number.

    that._ctxs[ssn] = canvas.getContext("2d");
    that._maps[ssn] = new Uint32Array(32); // 32 lines

    if (MultiSprite["VERBOSE"] && global["document"]) {
        canvas.style.cssText = "background: lime; border: 1px solid red";
        document.body.appendChild(canvas);

        if (MultiSprite["VERBOSE_VERBOSE"]) {
            // --- draw grid pattern ---
            that._ctxs[ssn].beginPath();
            for (var grid = 0; grid < 2048; grid += 64) {
                that._ctxs[ssn].moveTo(grid, 0);
                that._ctxs[ssn].lineTo(grid, 2047);
                that._ctxs[ssn].moveTo(0, grid);
                that._ctxs[ssn].lineTo(2047, grid);
            }
            that._ctxs[ssn].stroke();
            that._ctxs[ssn].closePath();
        }
    }
    return ssn; // new sprite sheet number
}
function _mapping(map, bx, by, bw, bh) {
    var bits = (0xFFFFFFFF << (32 - bw)) >>> bx;

    for (var byz = by + bh; by < byz; ++by) {
        map[by] |= bits;
    }
}
function _unmapping(map, bx, by, bw, bh) {
    var bits = ~(0xFFFFFFFF << (32 - bw)) >>> bx;

    for (var byz = by + bh; by < byz; ++by) {
        map[by] &= bits;
    }
}
function _getPopulationCount(bits) { // @arg UINT32 - value
                                     // @ret UINT8 - from 0 to 32
                                     // @desc SSE4.2 POPCNT function
    bits = (bits & 0x55555555) + (bits >>  1 & 0x55555555);
    bits = (bits & 0x33333333) + (bits >>  2 & 0x33333333);
    bits = (bits & 0x0f0f0f0f) + (bits >>  4 & 0x0f0f0f0f);
    bits = (bits & 0x00ff00ff) + (bits >>  8 & 0x00ff00ff);
    return (bits & 0x0000ffff) + (bits >> 16 & 0x0000ffff);
}


function MultiSprite_keys() { // @ret KeyStringArray - [key, ...]
    return Object.keys(this._imageData);
}

function MultiSprite_remove(key) { // @arg String
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(key, "String"), MultiSprite_remove, "key");
    }
//}@dev

    var data = this._imageData[key]; // { ssn, sw, sh, bx, by, bw, bh }
    if (data) {
        var ssn = data.ssn;

        _unmapping(this._maps[ssn], data.bx, data.by, data.bw, data.bh);
        this._ctxs[ssn].clearRect(data.bx * 64, data.by * 64, data.sw, data.sh);
      //this._imageData[key] = null; // As you know this code is quick, but becomes a little complex.
        delete this._imageData[key];
    }
}

function MultiSprite_clear() {
    this._maps = [];
    this._ctxs = [];
    this._spriteSheets = [];
    this._imageData = {};
}

// === Utility =============================================
function MultiSprite_dump(ssn) { // @arg SpriteSheetNumber = undefined
    if (ssn === undefined) { // dump all
        this._maps.forEach(function(map, ssn) {
            console.log("SpriteSheet No: " + ssn);
            _dump(map);
        });
    } else {
        _dump(this._maps[ssn]);
    }

    function _dump(map) {
        for (var y = 0; y < 32; ++y) {
            console.log( (y < 10 ? ("0" + y) : y) + ":", _bin(map[y]) );
        }
    }
}

function _bin(num) {
    var binary32 = "00000000000000000000000000000000";
    var bin = (binary32 + num.toString(2)).slice(-32);

    return bin.replace(/(\d)(?=(\d\d\d\d)+(?!\d))/g, "$1,");
}

function MultiSprite_imageLoader(resources,  // @arg Array - HTMLImageElement or URLString or BlobURLString. [img, url, bloburl, ...]
                                 finished,   // @arg Function - callback(images:HTMLImageElementArray):void
                                 fail,       // @arg Function = null - fail(error:Error):void
                                 progress) { // @arg Function = null - progress(image:HTMLImageElement):void
    var NOP = function() {};
    var result = {
            images: [],
            loadedCount: 0
        };

    _imageLoader(result, resources, 0, resources.length, finished, fail || NOP, progress || NOP);
}

function _imageLoader(result, resources, i, iz, finished, fail, progress) {
    if (result.loadedCount >= iz) {
        finished(result.images);
    } else {
        var res = resources[i];

        if (res instanceof HTMLImageElement) {
            result.images[i] = res;
            result.loadedCount++;
            progress(res);
            _imageLoader(result, resources, i + 1, iz, finished, fail, progress);
        } else if (typeof res === "string") {
            var img = document.createElement("img");

            img.onload = function() {
                result.images[i] = img;
                result.loadedCount++;
                progress(img);
                _imageLoader(result, resources, i + 1, iz, finished, fail, progress);
            };
            img.onerror = function() {
                fail(new Error("IMAGE LOAD ERROR: " + res));
            };
            img.src = res;
        }
    }
}

// --- validate / assertions -------------------------------
//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
//function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = MultiSprite;
}
global["MultiSprite" in global ? "MultiSprite_" : "MultiSprite"] = MultiSprite;

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

