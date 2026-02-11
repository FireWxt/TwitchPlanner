const {MongoClient, ServerApiVersion} = require('mongodb');
const mongoUri ="mongodb+srv://semiaosimon_db_user:jGgdd9w9C7SAkPc2@cluster0.gns9w2o.mongodb.net/?appName=Cluster0"

const client = new MongoClient(mongoUri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Connected to MongoDB");
    } finally {
        await client.close();
    }
}

module.exports = {
    run
};

