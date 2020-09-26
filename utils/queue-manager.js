const Oxen = require('oxen-queue')
const dotenv = require('dotenv')

dotenv.config()

const ox = new Oxen({
    mysql_config: {
        host: `${process.env.DB_HOST}`,
        user: `${process.env.DB_USER}`,
        password: `${process.env.password}`,
        database: `${process.env.database}`
    },
    db_table: `${process.env.database}.oxen_queue`, // (optional) name the table that oxen will use in your database.
    job_type: 'message_renders', // give this queue a job type. Other instances of oxen with the same job type will be the same queue.
});

module.exports = ox;