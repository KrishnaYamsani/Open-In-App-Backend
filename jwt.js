require('dotenv').config();
const jwt = require('jsonwebtoken');

function generateToken (user){
    return jwt.sign(user,process.env.ACCESS_TOKEN_SECRET + user.user_id,{expiresIn: '60m'});
}

function authenticateToken(req,res,next){
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token){
        res.sendStatus(401);
    }

    let user_id = req.body.user_id || req.params.userId ;
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET+user_id,(err) => {
        if (err) return res.sendStatus(403);
        next()
    })
}

module.exports = {generateToken,authenticateToken};

