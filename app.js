const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const post = require('./models/post');
const path = require("path");
// const multer = require('multer');
const upload = require("./config/multerconfig");


app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")));

// const fn = crypto.randomBytes(12, (err,bytes)=>{
//     console.log(bytes.toString("hex"));
//   })

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, './public/images/uploads')
//     },
//     filename: function (req, file, cb) {
//        crypto.randomBytes(12, (err,bytes)=>{
//         const fn =  bytes.toString("hex") + path.extname(file.originalname);
//         cb(null, fn)
//       })
//     //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      
//     }
//   })
  
// const upload = multer({ storage: storage })


app.get("/", (req,res)=>{
    res.render("index");
})

app.get("/login",  (req,res)=>{
    res.render("login");
})

app.get("/profile", isLoggedIn, async(req,res)=>{
    // console.log(req.user);
    // res.render("login");

    let user = await userModel.findOne({email: req.user.email}).populate("post");
    // console.log(user);
    res.render("profile",{user});
})

app.get("/like/:id", isLoggedIn, async(req,res)=>{
   
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
    if(post.like.indexOf(req.user.userid)==-1)
        post.like.push(req.user.userid);
    else    
        post.like.splice(post.like.indexOf(req.user.userid),1);

    
    await post.save();
    res.redirect("/profile");
})

app.get("/edit/:id", isLoggedIn, async(req,res)=>{
   
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
    
    res.render("edit",{post});
})

app.post("/update/:id", isLoggedIn, async(req,res)=>{
   
    let post = await postModel.findOneAndUpdate({_id: req.params.id},{content: req.body.content});  
    res.redirect("/profile");
})

app.get("/profile/upload", (req,res)=>{
    res.render("profilepic");
})


app.post("/upload",  isLoggedIn,upload.single("image"),async(req,res)=>{
    let user  = await userModel.findOne({email: req.user.email});
    user.profilepic= req.file.filename;
    await user.save();
    res.redirect("/profile");

})
// app.get("/test", (req,res)=>{
//     res.render("test");
// })


// app.post("/upload", upload.single("image") ,(req,res)=>{
//     console.log(req.file);

// })

app.post("/post", isLoggedIn, async(req,res)=>{
   
    let user = await userModel.findOne({email: req.user.email});
    let{content} = req.body;
    let post = await postModel.create({
        user: user._id,
        content
    })
    user.post.push(post._id);
    await user.save();
    res.redirect("/profile");
})

app.post("/register", async(req,res)=>{
    let {email,password,username,name,age} = req.body;
    let user  = await userModel.findOne({email: email});
    if(user)    
        return res.status(500).send("User already registered");
    
    bcrypt.genSalt(10,(err,salt)=>{
        // console.log(salt);    
        bcrypt.hash(password,salt,async(err,hash)=>{
            // console.log(hash);
            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password:hash
            })

            // await newuser.save();
            let token = jwt.sign({email: email, userid: user._id},"secretkey");
            res.cookie("token",token);
            res.send("registered");

        })
    })


})

app.post("/login", async(req,res)=>{
    let {email,password} = req.body;
    let user  = await userModel.findOne({email: email});
    if(!user)    
        return res.status(500).send("Something Went Wrong");
    
    bcrypt.compare(password,user.password,(err,result)=>{
        if(result){
            let token = jwt.sign({email: email, userid: user._id},"secretkey");
            res.cookie("token",token);
            res.status(200).redirect("/profile");
        }
                
        else{
                res.redirect('/login');       
        }
    })
})

app.get("/logout", async(req,res)=>{
    res.cookie("token","");
    res.redirect("/login");
})

function isLoggedIn(req,res,next){

    // console.log(req.cookies);
    // next();
    if(!req.cookies.token || req.cookies.token === "")
            res.redirect("/login");
    else{
        let data = jwt.verify(req.cookies.token,"secretkey");
        req.user = data;
        next();
    }
    

}









app.listen(3000,()=>{
    console.log("Mini Project is running");
})

