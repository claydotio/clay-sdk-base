## Clay.io SDK Base

Clay.io SDK Base is a subset of the [Clay.io SDK](https://github.com/claydotio/clay-sdk)

### Install

Add to the top of `<body>`

```html
<script>
(function(c,l,a,y,i,o,☃){c[i]=c[i]||function(){
(c[i].q=c[i].q||[]).push(arguments)},c[i].l=1*new Date();o=l.createElement(a),
☃=l.getElementsByTagName(a)[0];o.async=1;o.src=y;☃.parentNode.insertBefore(o,☃)
})(window,document,'script','//cdn.wtf/sdk/v1/clay_sdk.js','Clay');

Clay('init', {gameId: 0000})
</script>
```

### Example

```js
Clay('init', {gameId: 0000})

Clay('client.share.any', {text: 'Come play a game with me!'})
```

### Usage

##### Init

```js
Clay('init', {gameId: 0000}, function () {
  // Clay has been initialized
})
```

##### Share Any

Share a message using the best available option.  
See [Clay.io SDK](https://github.com/claydotio/clay-sdk) docs for details.

```js
Clay('client.share.any', {text: 'Hello World'})
```

##### Version

```js
Clay('version', function (version) {
  console.log(version);
})
```

### Contributing

##### Install pre-commit hook

`ln -s ../../pre-commit.sh .git/hooks/pre-commit`

```bash
npm install
npm test
```
