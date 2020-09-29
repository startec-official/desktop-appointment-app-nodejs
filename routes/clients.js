var express = require('express');
var clientsRouter = express.Router();
var connection = require('../connections/mysql-connection');

clientsRouter.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // TODO: write more secure headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

clientsRouter.get('/displayAll',(req,res)=> {
    connection.query('SELECT * FROM clients', function (err, rows, fields) { 
        if (err) throw err
        res.json(rows);
    });
});

clientsRouter.delete( '/remove/:userId' , (req,res,next) => { // TODO: secure queries with hashed auth or headers
    const id = parseInt( req.params.userId , 10 );
    connection.query( 'DELETE FROM clients WHERE client_id = ?' , id , (err , rows , fields) => {
        if( err ) throw err;
        res.sendStatus(200);
    });
});

module.exports = clientsRouter;