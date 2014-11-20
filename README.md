## Clay.io SDK Base

Clay.io SDK Base is a subset of the [Clay.io SDK](https://github.com/claydotio/clay-sdk)

### Install

Add to the top of `<body>`

```html
<script>
(function(C,l,a,y,_,i,o){C[_]=C[_]||function(){
(C[_].q=C[_].q||[]).push(arguments)},C[_].l=1*new Date();i=l.createElement(a),
o=l.getElementsByTagName(a)[0];i.async=1;i.src=y;o.parentNode.insertBefore(i,o)
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
Clay('init', {gameId: 0000})
```

##### Share Any

Share a message using the best available option.  
See [Clay.io SDK](https://github.com/claydotio/clay-sdk) docs for details.

```js
Clay('client.share.any', {text: 'Hello World'})
```

##### Version

```js
Clay('version', function (err, version) {
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
