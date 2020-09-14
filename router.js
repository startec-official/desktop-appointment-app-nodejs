var express = require('express');

var router = express.Router()
var connection = require('./connection');

router.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // TODO:write more secure headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    console.log( res.getHeaders() );
    next();
});

router.get('/display',(req,res)=> {
connection.query('SELECT * FROM clients', function (err, rows, fields) { 
    if (err) throw err
    res.send(rows);
})
});

router.post('/save',(req,res) => {

// generate array from input
let schedData = [];
for (let index = 0; index < req.body.length; index++) {
    schedData.push( [ req.body[index].date , req.body[index].time , req.body[index].appCount ] );
}
let saveQuery = '';
if ( schedData.length > 0 ) {
    saveQuery = ` 
    DELETE FROM schedule;
    INSERT INTO schedule (
        sched_date,
        sched_time,
        sched_slots
    )
    VALUES ?
`;
    connection.query(saveQuery, [schedData], function (err, rows, fields) {
    if (err) throw err;
    console.log("Connected to mySQL Server! The query finished with the following response:");
    console.log( rows );
    })
}

});

module.exports = router;
