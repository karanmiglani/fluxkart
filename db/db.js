const mysql = require('mysql2/promise.js')
require('dotenv').config()
let db;
const pool = mysql.createPool({
    host : process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DATABSE_NAME,
    waitForConnections : true,
    connectionLimit :  10 ,
})


pool.getConnection().then(connection => {
    console.log('Connected')
    connection.release()
}).catch(err => {
    console.log('Error' , err)
})
    

module.exports = pool