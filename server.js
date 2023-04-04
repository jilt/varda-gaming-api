require('dotenv').config()
const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fetch = require('cross-fetch')
const logger = require('./utils/logger')
const db = require('./utils/db')
const fs = require('fs')
const path = require('path')


app.use(express.json());


app.use(express.urlencoded({ extended: true }))
//use json
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/views'));

app.get('/token/:tokenId', (req, res) => {
    console.log(req.locked)
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


app.post('/register', async (req, res) => {
    try {
        // create jwt accessToken to access safe endpoint
        const user = req.body.name
        // JWT Must be valid to work on the /new route. I made the validity of a jwt 30 days. you can change it.
        const accessToken = jwt.sign({ name: user }, process.env.ACCESS_TOKEN_SECRET)
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
    } catch (err) {
        res.status(500).redirect('/register')
    }
})


// token restricted endpoint
app.get('/new', authenticateToken, (req, res) => {
    res.render('new')
})

// unlockables endpoints

app.post('/new/:tokenId/:CID/:link', authenticateToken, (req, res) => {
    res.send(`Set unlockable of NFT ${req.params.tokenId}`);
    var newLocked = {
        id: req.params.tokenId,
        CID: req.params.CID,
        link: `https://${req.params.link}`
    };
    // Update the db.json file (created automatically if it does not exist)
    db(newLocked, 'db.json');
})


app.put('/new/:tokenId/:CID/:link', authenticateToken, (req, res) => {
    res.send(`Update unlockable of NFT ${req.param.tokenId}`)
    var newLocked = {
        id: req.params.tokenId,
        CID: req.params.CID,
        link: req.params.link
    };

    send.json(newLocked);
})

app.delete('/new/:tokenId', authenticateToken, (req, res) => {
    res.send(`Delete unlockable of NFT ${req.param.tokenId}`);
})
app.param('tokenId', (req, res, next, tokenId) => {
    //req.locked = lockedb[tokenId];
    next();
}
)

//middleware to autenticate JWT token

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) return res.sendStatus(401)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403)
        req.user = user.name
        next()
    })
}

const mintbasedb = require("./db.json");
app.get('/mintbasevault', (req, res) => {
    res.json(mintbasedb);
})

app.get('/owner/:name', fetchByContract, (req, res) => {
    res.send(`NFT Owned by ${req.params.name}`)
})

app.get('/', (req, res) => {
    console.log('server running')
    res.render('index', { text: 'world' })
})

async function fetchByContract(req, res, next) {

    const rawNfts = [];
    let response = await fetch(
        `https://api.kitwallet.app/account/${req.params.name}/likelyNFTsFromBlock`
    );
    if (response.status >= 400) {
        return res.status(400).send();
    }
    const data = await response.json();
    const contracts = data.list;

    for (let i = 0; i < contracts.length; i++) {
        let batch = contracts[i];
        let regExp = /\[([^)]+)\]/;
        let mintegExp = new RegExp(/mintbase/);
        matching = mintegExp.test(batch);
        const nearUtils = async () => {
            try {
                let response = await fetch(
                    `https://rpc.web4.near.page/account/${batch}/view/nft_tokens_for_owner?account_id=${req.params.name}`
                );
                const data = await response.text();
                const rawNft = data.toString();
                let cleaNft = regExp.exec(rawNft);
                if (cleaNft !== null) {
                    cleaned = cleaNft[0];
                    cleanObj = JSON.parse(cleaned);
                    if (matching === true) {
                        var preres = await fetch("https://interop-mainnet.hasura.app/v1/graphql", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                                query:
                                    '{ nft_tokens(where: {nft_contract_id: {_eq: "jiltverse.mintbase1.near"}, token_id: {_eq: "' + cleanObj[0].token_id + '"}}) { metadata_id }}'
                            }),
                        })
                        const owndata = await preres.json();
                        const owndatastr = JSON.stringify(owndata);
                        const ownraw = JSON.parse(owndatastr);
                        const owned = ownraw.data.nft_tokens;
                        // write only if you find metadata
                        if (typeof owned[0] === "undefined") { } else {
                            var token_id = owned[0].metadata_id;
                            var token = [
                                { token_id: token_id }
                            ]
                            rawNfts.push(token);
                        }
                    } else {
                        rawNfts.push(cleanObj)
                        return cleanObj;
                    }
                }
            } catch (error) {
                console.log('error', error);
            }
        };
        let allNfts = await nearUtils();
    }
    //resNfts = JSON.stringify(rawNfts);
    res.json(rawNfts);
}

function verifyUser(req, res, next) {
    const userData = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8');
    let verifyData = userData ? JSON.parse(userData) : { users: [] }
    for (var i = 0, l = verifyData.users.length; i < l; i++) {
        var ver = verifyData.users[i];
        bcrypt.compare(req.body.password, ver.password, function (err, result) {
            if (result) {
                res.render('accesstoken', {
                    token: `${ver.accessToken}`
                })
            }
        });
    }
    next()
}

app.listen(8080)
