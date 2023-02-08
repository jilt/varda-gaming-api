require('dotenv').config()
const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fetch = require('cross-fetch')
const near = require('near-api-js')
const logger = require('./utils/logger')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto');


app.use(express.json());

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
//use json
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  console.log('server running')
  res.render('index', { text : 'world'})
})


app.get('/token', (req, res) => {
  res.send(crypto.randomBytes(32).toString('hex'));
})
app.get('/register', (req, res) => {
  res.render('register')
})

app.get('/login', (req, res) => {
    res.render('login')
})
app.post('/login', verifyUser, (req, res) => {
    //res.redirect(`/users/${tokenHolder}`)
})


app.post('/register', async (req, res) =>{
  try {
    // create jwt accessToken to access safe endpoint
    const user = req.body.name
    // JWT Must be valid to work on the /new route. I made the validity of a jwt 30 days. you can change it.
    const accessToken = jwt.sign({ name: user }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30d'})
    const hashedPassword = bcrypt.hashSync(req.body.password, 10)

    const userObject = { 
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      accessToken: accessToken
    }

    // Update the users.json file (created automatically if it does not exist)
    logger(userObject, 'users.json')

    res.status(201).redirect('/login')
  } catch(err) {
    res.status(500).redirect('/register')
  }
})


// token restricted endpoint
app.get('/new', authenticateToken, (req, res) => {
  console.log('add unlockable')
  console.log(req.user) //The name of user
  res.render('new')
})

//middleware to autenticate JWT token

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if(!token) return res.sendStatus(401)

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if(err) return res.sendStatus(403)
      req.user = user.name
    next()
  })
}

  
app.get('/owner/:name', fetchByContract, (req, res) => {
  res.send(`NFT Owned by ${req.params.name}`)
})


function fetchByContract(req, res, next) {
 // urls to check json responses: 
// https://rpc.web4.near.page/account/mailgun.near/view/nft_tokens_for_owner?account_id=jilt.near
//  https://rpc.web4.near.page/account/mint-varda.near/view/nft_tokens_for_owner?account_id=jilt.near

    var nfts = [];
  fetch(`https://api.kitwallet.app/account/${req.params.name}/likelyNFTsFromBlock`)
  .then(res => {
    if(res.status >= 400) return res.status(400);
    return res.json()
  }).then(object => {
    res.result = object;
      const contracts = object.list;
      nfts = [];
      for (var i = 0, l = contracts.length; i < l; i++) {
          var batch = contracts[i];
          const nearUtils = async () => {
              fetch(`https://rpc.web4.near.page/account/${batch}/view/nft_tokens_for_owner?account_id=${req.params.name}`)
                  .then(res => {
                      error = res.includes("method nft_tokens_for_owner not found");
                      if (error = true) {
                          return {}
                      } else {
                          nft = JSON.parse(res);
                          console.log(nft);
                          nfts.push(nft);
                          return nft;
                      }
                      // return res.json()
                  })
          }
          var nfts = nearUtils();
          if (nfts !== undefined) {
              console.log(nfts);
          } else {
              console.log("cannot find anything")
          }

      }
  })
  next()
}

function verifyUser(req, res, next) {
    const userData = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8');
    let verifyData = userData ? JSON.parse(userData) : { users: [] }
    for (var i = 0, l = verifyData.users.length; i < l; i++) {
        var ver = verifyData.users[i];
        bcrypt.compare(req.body.password, ver.password, function (err, result) {
            if (result) {
                res.render('accesstoken', {
                    token: `${ver.accessToken }` })
            }
        });
    }
    next()
}

//app
//  .route('/token/:tokenId')
//  .get((req, res)=>{
//    res.send(`Owners of NFT ${req.param.tokenId}`) 
//  })
//.put((req, res)=>{
//    res.send(`Update unlockable of NFT ${req.param.tokenId}`)
//  })
//.delete((req, res)=>{
//    res.send(`Delete unlockable of NFT ${req.param.tokenId}`)
//  })
//.post((req, res)=>{
//    res.send(`Set unlockable of NFT ${req.body.tokenId}`)
// get tokenid from query string
//    console.log(req.query.tokenId)
//  })

//app.param('tokenId', (req, res, next, tokenId) => {
//  req.token = NFTs[tokenId]
//  next()
//})

app.listen(3333)