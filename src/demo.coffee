Clay = require './index'

shareBtn = document.createElement('button')
shareBtn.innerText = 'Share.any()'
shareBtn.style.padding = '20px'
shareBtn.style.fontSize = '30px'
document.body.appendChild(shareBtn)


Clay 'init', gameId: '1'

shareBtn.addEventListener 'click', ->
  Clay 'client.share.any', [{text: 'abc'}], (err) ->
    if err
      console.log err
