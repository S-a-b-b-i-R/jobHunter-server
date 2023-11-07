const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;

//middleware
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://car-doctor-819e5.web.app",
            "https://car-doctor-819e5.firebaseapp.com",
        ],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.uao1z0b.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const verufyToken = async (req, res, next) => {
    const token = req.cookies.token;
    // console.log(token);
    if (!token) {
        return res.status(401).send("Access Denied");
    }
    try {
        const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        // console.log("bhua token");
        res.status(400).send("Invalid Token");
    }
};

async function run() {
    try {
        const database = client.db("jobsDB");

        //get token when user logs in
        app.post("/api/auth/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1h",
            });
            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });
            res.send({ success: true });
        });

        //delete token when user logs out
        app.post("/api/auth/logout", async (req, res) => {
            await res.clearCookie("token", {
                maxAge: 0,
            });
            res.send({ success: true });
        });

        //get all job categories
        app.get("/api/jobs/categories", async (req, res) => {
            const categories = await database
                .collection("jobCategories")
                .find({})
                .toArray();
            res.send(categories);
        });

        //post job
        app.post("/api/jobs", verufyToken, async (req, res) => {
            const job = req.body;
            //change job keys
            const result = await database
                .collection("jobsCollection")
                .insertOne(job);
            res.send(result);
        });

        //get all jobs
        app.get("/api/jobs", async (req, res) => {
            const jobs = await database
                .collection("jobsCollection")
                .find({})
                .toArray();
            res.send(jobs);
        });

        //get jobs by category id, if category id is not given, will return all jobs
        app.get("/api/jobs/:categoryId?", async (req, res) => {
            const categoryId = req.params.categoryId;
            if (categoryId) {
                const jobs = await database
                    .collection("jobsCollection")
                    .find({ jobCategoryId: categoryId })
                    .toArray();
                res.send(jobs);
            } else {
                const jobs = await database
                    .collection("jobsCollection")
                    .find({})
                    .toArray();
                res.send(jobs);
            }
        });

        //get job detail by id
        app.get("/api/job/:id", async (req, res) => {
            const id = req.params.id;
            const job = await database
                .collection("jobsCollection")
                .findOne({ _id: new ObjectId(id) });
            res.send(job);
        });

        //add user applied job
        app.post("/api/user/jobs", verufyToken, async (req, res) => {
            const userJob = req.body;
            const result = await database
                .collection("userJobsCollection")
                .insertOne(userJob);
            //add 1 to the applicantsNumber of the job in jobsCollection
            const job = await database
                .collection("jobsCollection")
                .findOne({ _id: new ObjectId(userJob.appJob) });
            const applicantsNumber = job.applicantsNumber + 1;
            try {
                await database
                    .collection("jobsCollection")
                    .updateOne(
                        { _id: new ObjectId(userJob.appJob) },
                        { $set: { applicantsNumber: applicantsNumber } }
                    );
            } catch (error) {
                console.log(error);
            }

            res.send(result);
        });

        //check if a user already applied for a job by using userId and jobId
        app.get("/api/user/jobs/:userId/:jobId", async (req, res) => {
            const userId = req.params.userId;
            const jobId = req.params.jobId;
            const userJob = await database
                .collection("userJobsCollection")
                .findOne({ userId: userId, appJob: jobId });
            if (userJob) {
                res.send(true);
            } else {
                res.send(false);
            }
        });

        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Server is running");
});

app.listen(port, () => {
    console.log("Server is running on port: ", port);
});
