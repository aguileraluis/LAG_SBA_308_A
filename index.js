require('dotenv').config(); 
const express = require('express'); 
const cors = require('cors'); 
const favicon = require('serve-favicon'); 
const bodyParser = require('body-parser'); 
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 
const path = require('path'); 
const mongoose = require('mongoose'); 
const validator = require('validator');
const fs = require('fs');

const jwtSecret = process.env.JWT_SECRET; 
const app = express(); 
const PORT = process.env.PORT || 5501; 

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico'))); 

const connectDB = async() => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true, 
      useUnifiedTopology: true
    });
  } catch (error) {
    console.log(error); 
  }
}

connectDB().then(() => {
  console.log(`Listening on port ${PORT}`); 
})

const Post = mongoose.model(
  'Post', 
  new mongoose.Schema({
    title: String, 
    content: String, 
    imageUrl: String, 
    author: String, 
    timestamp: String
  })
)

const User = mongoose.model(
  'User', 
  new mongoose.Schema({
    username: String, 
    password: String, 
    role: String
  })
)

app.use(cors({ origin: '*' })); 
app.use(bodyParser.json()); 
app.use(express.static(path.join(__dirname))); 

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html')); 
})

const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1]; 

  if (token) {
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        console.log('JWT verification Error', err.message);
        return res.sendStatus(404);  
      }
      req.user = user; 
      next(); 
    }); 
  } else {
    console.log('Token is missing'); 
    res.sendStatus(404); 
  }
}

app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  const sanitizedUsername = validator.escape(username);
  const sanitizedPassword = validator.escape(password);

  if (!sanitizedUsername || !sanitizedPassword) {
    return res.status(400).send({ error: 'Invalid input data' }); 
  }

  const hashedPassword = await bcrypt.hash(sanitizedPassword, 10); 
  const newUser = new User({
    username: sanitizedUsername,
    password: sanitizedPassword, 
    role
  }); 

  await newUser.save(); 
  res.status(200).send({ success: true }); 
}); 

app.post('/login', async(req, res) => {
  const { username, password } = req.body; 

  const sanitizedUsername = validator.escape(username);
  const sanitizedPassword = validator.escape(password);

  if (!sanitizedUsername || !sanitizedPassword) {
    return res.status(400).send({ error: 'Invalid input data' }); 
  }

  const user = await User.findOne({ username: sanitizedUsername }); 

  if (user) {
    if (bcrypt.compare(password, user.password)) {
      const accessToken = jwt.sign(
        {
        username: user.username, 
        role: user.role
        }, 
        process.env.JWT_SECRET, 
        {
        expiresIn: '24',
        }
    ); 
      res.status(200)
      .send({ success: true, token: accessToken, role: user.role }); 
    } else {
      res.status(400).send({ success: false }); 
    }
  } 
}); 

app.get('/posts', async (req, res) => {
  const posts = await Post.find(); 
  res.status(200).send(posts); 
})

app.post('/posts', authenticateJWT, async (req, res) => {
  if (req.user.role === 'admin') {
    const { title, content, imageUrl, author, timestamp } = req.body; 

    const newPost = new Post({
      title, 
      content, 
      imageUrl, 
      author, 
      timestamp
    }); 

    newPost
      .save()
      .then((savedPost) => {
        res.status(200).send(savedPost); 
      })
      .catch((error) => {
        res.status(500).send({ error: 'Internal Server Error' }); 
      })
  } else {
    res.sendStatus(400); 
  }
}); 

app.get('/post/id', async (req, res) => {
  const postId = req.params.id; 
  const post = await Post.findById(postId); 
  if (!post) {
    return res.status(404).send('Post not found'); 
  } 

  fs.readFile(path.join(__dirname, 'post-detail.html'), 'utf8', (err, data) => {
    if(err) {
      console.log(err); 
      return res.status(500).send('Internal Server Error'); 
    }

    const postDetailHtml = data
    .replace(/\${post.imageUrl}/g, post.imageUrl)
    .replace(/\${post.title}/g, post.title)
    .replace(/\${post.author}/g, post.author)
    .replace(/\${post.content}/g, post.content)

    res.status(200).send(postDetailHtml); 
  }); 
}); 

app.delete('/posts:id', authenticateJWT, async (req, res) => {
  if (req.user.role === 'admin') {
    try {
      await Post.findByIdAndDelete(req.params.id); 
      res.status(200).send({ message: 'Post deleted'}); 
    } catch(error) {
      res.status(500).send({ error: 'Internal Server Error' }); 
    }
  } else {
    res.status(404).send( {error: 'Forbidden'} ); 
  }
})

app.put('/posts:id', authenticateJWT, async (req, res) => {
  const { title, content } = req.body; 
  const postId = req.params.id; 

  try {
    const post = await Post.findById(postId); 

    if (!post) {
      return res.status(404).send({ error: 'Post not found' })
    }

    if (req.user.role === 'admin') {
      post.title = title; 
      post.content = content; 
      await post.save(); 
      res.status(200).send(post); 
    } else {
      res.status(403).send({ error: 'Forbidden' })
    }
  } catch (error) {
    res.status(500).send({ error: 'Internal Server Error' }); 
  }
}); 




