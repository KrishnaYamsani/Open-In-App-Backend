require('dotenv').config()
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: 5432,
    ssl : true
  });
const connection = "postgres://"+ process.env.USER+":"+process.env.PASSWORD+"@"+process.env.HOST+"/"+process.env.DATABASE ;
module.exports = pool ;