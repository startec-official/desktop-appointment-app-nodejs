const Oxen = require('oxen-queue') // module enabling the creation of a queue for the server
const dotenv = require('dotenv') // module for accessing the environment file
// uses the defined values in the environment file
dotenv.config() 

const ox = new Oxen({ // create a new queue instance
    mysql_config: {
        host: `${process.env.DB_HOST}`, // actual values found in env variable, done to protect sensitive information
        user: `${process.env.DB_USER}`,
        password: `${process.env.password}`,
        database: `${process.env.database}`
    },
    db_table: `${process.env.database}.oxen_queue`, // (optional) name the table that oxen will use in your database.
    job_type: 'message_renders', // give this queue a job type. Other instances of oxen with the same job type will be the same queue.
});

module.exports = ox;