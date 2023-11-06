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
        const database = client.db("carDoctorDB");

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
