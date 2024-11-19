var express = require('express'); 
var router = express.Router(); 

router.get('/', function(req, res) {
  res.render('index', {}); 
})

router.get('/post', (req, res) => {
  res.render('post-detail', {}); 
})


module.exports = router; 

