const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//cors
app.use(cors());
app.use(express.json());

//AUTH
app.post("/login", async (req, res) => {
  const user = req.body;
  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
    expiresIn: "1d",
  });
  res.send({ accessToken });
});
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "FORBIDDEN" });
    }
    req.decoded = decoded;
  });
  next();
}
//mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.onwscvn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const breakfastCollection = client.db("Red-onion").collection("Breakfast");
    const lunchCollection = client.db("Red-onion").collection("Lunch");
    const dinnerCollection = client.db("Red-onion").collection("Dinner");
    const cartCollection = client.db("Red-onion").collection("cart-collection");
    const detailCollection = client
      .db("Red-onion")
      .collection("Details-collection");

    //Load Foods
    //Breakfast
    app.get("/breakfast", async (req, res) => {
      const query = {};
      const cursor = breakfastCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    //Lunch
    app.get("/lunch", async (req, res) => {
      const query = {};
      const cursor = lunchCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/dinner", async (req, res) => {
      const query = {};
      const cursor = dinnerCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // add to cart
    app.post("/addcart", async (req, res) => {
      const cart = req.body;
      const query = {
        food: cart?.food,
        uid: cart?.uid,
        paid: false,
      };
      const exists = await cartCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await cartCollection.insertOne(cart);
      return res.send({ success: true, result });
    });
    //see cart
    app.get("/addcart", async (req, res) => {
      const uid = req.query.uid;
      const query = { uid: uid, paid: false };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    //see history
    app.get("/history", async (req, res) => {
      const uid = req.query.uid;
      const query = { uid: uid, paid: true };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    //delete cart
    app.delete("/addcart/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await cartCollection.deleteOne(filter);
      res.send(result);
    });
    //update when it is finish
    app.patch("/addcart", verifyJWT, async (req, res) => {
      const body = req.body;
      const updateDoc = {
        $set: {
          paid: true,
        },
      }
      const updateBooking = await cartCollection.updateMany(body, updateDoc);
      res.send(updateBooking);
    });
    //delivery details
    app.post("/deliverydetails", async (req, res) => {
      const details = req.body;
      const result = await detailCollection.insertOne(details);
      res.send(result);
    });
    app.get("/deliverydetails", async (req, res) => {
      const query = {};
      const result = await detailCollection.find(query).toArray();
      res.send(result);
    });
    //stripe payment method
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });
   
  } finally {
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from red onion!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
