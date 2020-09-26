const Oxen = require('oxen-queue')

const ox = new Oxen({
    mysql_config: {
        user: 'mysql_user',
        password: 'mysql_password',
        // anything else you need to pass to the mysql lib
    },
    db_table: `${proces.env.database}.oxen_queue`, // (optional) name the table that oxen will use in your database.
    job_type: 'message_renders', // give this queue a job type. Other instances of oxen with the same job type will be the same queue.
})

/* If this is your first time running oxen, run this line to automatically create the database table. You should only need to run this once. */
await ox.createTable()