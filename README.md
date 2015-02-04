# MultiSprite.js [![Build Status](https://travis-ci.org/uupaa/MultiSprite.js.png)](http://travis-ci.org/uupaa/MultiSprite.js)

[![npm](https://nodei.co/npm/uupaa.multisprite.js.png?downloads=true&stars=true)](https://nodei.co/npm/uupaa.multisprite.js/)

Multiple Sprite(Texture) handler.

## Document

- [MultiSprite.js wiki](https://github.com/uupaa/MultiSprite.js/wiki/MultiSprite)
- [WebModule](https://github.com/uupaa/WebModule)
    - [Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
    - [Development](https://github.com/uupaa/WebModule/wiki/Development)

## Run on

### Browser

```js
<script src="lib/MultiSprite.js"></script>
<script>
var imageList = ["http://.../a.png", ...];
var sprite = new MultiSprite();

MultiSprite.imageLoader(imageList, function(images) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");

    for (var i = 0, iz = images.length; i < iz; ++i) {
        sprite.draw(images[i].src, ctx, i * 32, i * 32);
    }
}, function(error) {
    throw error;
}, function(image) {
    sprite.add(image.src, image);
});
</script>
```

### node-webkit

```js
<script src="lib/MultiSprite.js"></script>
<script>
</script>
```

