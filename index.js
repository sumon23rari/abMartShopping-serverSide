const express=require('express');
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const app=express();
const jwt= require('jsonwebtoken');
require('dotenv').config();
const cors=require('cors');
const stripe=require("stripe")(process.env.STRIPE_SECRET_KEY)
const port=process.env.PORT||9000;

// using middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ihmonoj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log('uri',uri)
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const database=client.db('abMart');
    const productCollection=database.collection('products');
    const reviewCollection=database.collection('reviews');
    const usersCollection=database.collection('users');
    const cartCollection=database.collection('carts');
    const userMessageCollection=database.collection('messageInfo');
    const paymentCollection=database.collection('paymentInfo')
    // Connect the client to the server	(optional starting in v4.7)
   // await client.connect();
    app.post('/jwt',async(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECCODE,{
        expiresIn:'22d'
      })
      res.send({token})
    });
    const verifyToken=(req,res,next)=>{
      if (!req.headers.authorization) {
        return res.status(401).send({message:'forbidden access'})
      }
      const token=req.headers.authorization.split(' ')[1];
      jwt.verify(token,process.env.ACCESS_TOKEN_SECCODE,(err,decoded)=>{
        if (err) {
          return res.status(401).send({message:'forbidden access'})
        }
        req.decoded=decoded;
      })

      next();
    };
    // check verifyAdmin after get verifyToken
    const verifyAdmin=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email:email};
      const user=await usersCollection.findOne(query);
     
      const isAdmin=user?.role==='admin';
      if (!isAdmin) {
        return res.status(403).send({message:'forbidden access'})
      }
      next()
    }
    app.get('/products',async(req,res)=>{
      
      //   const cursor= productCollection.find();
      //   const page=req.query.page;
      //   const size=parseInt(req.query.size);
      //   let products;
      // const count=await cursor.estimatedDocumentCount();
      // if (page) {
      //   products=await cursor.skip(page*size).limit(size).toArray();
      // }
      // else{
      //   products=await cursor.toArray();
      // }
      //   res.send(count,products)
      const products=await productCollection.find().toArray();
      res.send(products)
    });
    // add upload a products
    app.post('/products',verifyToken,verifyAdmin, async(req,res)=>{
      const insertProducts=req.body;
      console.log(insertProducts,'insertProducts')
      const query={productName:insertProducts.productName,productBrandName:insertProducts.productBrandName};
      console.log(query,'dlfsdlskd')
      const existingProduct=await productCollection.findOne(query);
      if (existingProduct) {
        return res.send({message:'this product already exist',insertedId:null})
      }
      const result=await productCollection.insertOne(insertProducts);
      res.send(result)
    });
    // product details page
    app.get('/products/:id',async(req,res)=>{
      const productId=req.params.id;
      const query={_id:new ObjectId(productId)};
      const result=await productCollection.findOne(query);
      res.send(result);
    });

    // delete a products
    app.delete('/products/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const deleteProductId=req.params.id;
      const query={_id:new ObjectId(deleteProductId)}
      const result=await productCollection.deleteOne(query);
      res.send(result);
    });
    // updateItems products
    app.patch('/products/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const updateProductInfo=req.body;
      const updateProductId=req.params.id;
      const query={_id:new ObjectId(updateProductId)};
      const updateDoc={
        $set:{
          productName:updateProductInfo.productName,
          productCategory:updateProductInfo.productCategory,
          productPrice:parseFloat(updateProductInfo.productPrice), 
          productBrandName:updateProductInfo.productBrandName,
          productColor:updateProductInfo.productColor,
          productImage:updateProductInfo.productImage
        }
      }
      const result=await productCollection.updateOne(query,updateDoc);
      res.send(result);
    });

    // user contct api
    app.post('/userContact',async(req,res)=>{
      const userMessage=req.body;
      console.log(userMessage,'userMesssage')
      const result=await userMessageCollection.insertOne(userMessage);
      res.send(result)
    });
    // review api
    app.post('/review',async(req,res)=>{
      const reviewText=req.body;
      const result=await reviewCollection.insertOne(reviewText);
      res.send(result);
    });
    app.get('/review',async(req,res)=>{
      const productId=req.query.productId;
      const query={productId:productId};
      console.log(query,'ddddd')
      const result=await reviewCollection.find(query).toArray();
      res.send(result);
    
    });
    app.get('/brandProducts',async(req,res)=>{
      const productBrand=req.query.brandProduct;
      const query={productBrandName:productBrand};
      const result=await productCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/similarProducts',async(req,res)=>{
     const category=req.query.productCategory;
     const query={productCategory:category};
     const result=await productCollection.find(query).toArray();
     res.send(result);
    });
    app.get('/productColors',async(req,res)=>{
      const colors=req.query.productColor;
      console.log('colors',colors)
      const query={productColor:colors};
      const result=await productCollection.find(query).toArray();
      res.send(result);
    });
    
    app.post('/users', async(req,res)=>{
      const insertUser=req.body;
      const query={email:insertUser.email};
      const existingUser=await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({message:'user already exist',insertedId:null})
      }
  const result=await usersCollection.insertOne(insertUser);
  res.send(result)
    });
    app.get('/users',verifyToken,async(req,res)=>{
      const query={};
      const result=await usersCollection.find(query).toArray();
      res.send(result);
    });
    app.get('/users/admin/:email',verifyToken,async(req,res)=>{
      const email=req.params.email;
      if (email !==req.decoded.email) {
       return res.status(403).send({message:'unauthorized access'}) 
      }
      const query={email:email};
      const user=await usersCollection.findOne(query);
      let admin=false;
      if (user) {
        admin=user?.role==='admin'
      }
      res.send({admin})
    });
    app.patch('/users/admin/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const updateUserId=req.params.id;
     // console.log(updateUserId,'updateUserId')
      const filter={_id:new ObjectId(updateUserId)};
      console.log(filter,'filter')
      const updateDoc={
        $set:{
          role:'admin'
        }
      };
      const result=await usersCollection.updateOne(filter,updateDoc);
      res.send(result)
    });
    app.delete('/users/:id',async(req,res)=>{
      const userId=req.params.id;
      const query={_id:new ObjectId(userId)}
      const result=await usersCollection.deleteOne(query);
      res.send(result);
    });
    app.post('/carts',async(req,res)=>{
      const insertCart=req.body;
      const result=await cartCollection.insertOne(insertCart);
      res.send(result)
    });
    app.get('/carts',async(req,res)=>{
      const email=req.query.email;
      const query={email:email};
      const result=await cartCollection.find(query).toArray();
      res.send(result)
    });
    app.delete('/cart/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const cartId=req.params.id;
      const query={_id:new ObjectId(cartId)};
      const result=await cartCollection.deleteOne(query);
      res.send(result);
    });
// payment intent
app.post("/create-payment-intent",async(req,res)=>{
const {price}=req.body;
const amount=parseInt(price*100);
const paymentIntent=await stripe.paymentIntents.create({
  amount:amount,
  currency:"usd",
  payment_method_types: [
    "card",
  
  ],
 
})
res.send({
  clientSecret:paymentIntent.client_secret
})
});
app.post("/payments",async(req,res)=>{
  const payment=req.body;
  const paymentResult=await paymentCollection.insertOne(payment);
  // carefully delete each item
  const query={_id:{
    $in:payment.cartIds.map(id=>new ObjectId(id))
  }}
  const deleteResult=await cartCollection.deleteMany(query);
  console.log(deleteResult)
  res.send({paymentResult,deleteResult})
});
app.get('/payments/:email',verifyToken,async(req,res)=>{
const email=req.params.email;
const query={email:email};
if (req.params.email !==req.decoded.email) {
  return res.status(403).send({message:'forbidden access'})
}
const result=await paymentCollection.find(query).toArray();
res.send(result)
});

// states or analatics
app.get('/admin-states',verifyToken,verifyAdmin,async(req,res)=>{
  const totalUsers=await usersCollection.estimatedDocumentCount();
  const totalProducts=await productCollection.estimatedDocumentCount();
const totalOrders=await paymentCollection.estimatedDocumentCount();
// this is not best way
// const payments=await paymentCollection.find().toArray();
// const revenue=payments.reduce((total,itemPrice)=>total+itemPrice.price,0)
const result=await paymentCollection.aggregate([
  {
    $group:{
      _id:null,
      totalRevenue:{
        $sum:'$price'
      }
    }
  }
]).toArray();
const revenue=result.length >0 ?result[0].totalRevenue:0;
// using aggregate pipeline

  res.send({
    totalUsers,
    totalProducts,
    totalOrders,
    revenue
  })
});
 // non efficent way
    //1. load all the payment
    // 2. for every menuItems (which is an array) go find the item form menu collection
    // 3. for every item in the menu collection that you found from a payment entry (document)
app.get('/order-states',async(req,res)=>{
const payments=await paymentCollection.find().toArray();
const products=await productCollection.find().toArray();
// Create a map of product items by their IDs
const productMap={};
products.forEach((product)=>{
  productMap[product._id.toString()]=product;
})

 // Initialize the result object
const result={};
    // Process each payment
payments.forEach((payment)=>{
  console.log(payment,'payment')
  payment?.productIds.forEach((productId)=>{
    const productItem=productMap[productId];
    if (productItem) {
      const category=productItem.productCategory;
      if (!result[category]) {
        result[category]={
          quantity: 0,
          revenue: 0,
        }
      }
      result[category].quantity += 1;
      result[category].revenue +=productItem.productPrice;
    }
  });
});

res.json(result)
// const productId=paymentProduct.map((item)=>item.productIds);
// console.log(productId)
 
});
  


    // Send a ping to confirm a successful connection
    
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  //  await client.close();
  }
}
run().catch(console.dir);
app.get('/',(req,res)=>{
  res.send('ami din kal')
});

app.listen(port,()=>{
    console.log(`Example app listening on port ${port}`)
})