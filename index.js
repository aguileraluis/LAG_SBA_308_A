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
const router = require('./router/routes.js');
const pug = require('pug');

router.get('/', function(req, res) {
  res.render('index', {}); 
})

const jwtSecret = 'super-secret-key-1234';
const app = express();
const PORT = process.env.PORT || 5500;

// mongoDB pw: gfivu7UMpNm7e2t8

// Favicon
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.set('views',path.join(__dirname, 'views')); 
app.set('view engine', 'pug'); 

app.use('/', router); 

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://luis:gfivu7UMpNm7e2t8@cluster0.bsxnu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {}
};

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
});

// MongoDB Models
const Post = mongoose.model(
  'Post',
  new mongoose.Schema({
    title: String,
    content: String,
    imageUrl: String,
    author: String,
    timestamp: String,
  })
);

const User = mongoose.model(
  'User',
  new mongoose.Schema({
    username: String,
    password: String,
    role: String,
  })
);

const Comment = mongoose.model(
  'Comment', 
  new mongoose.Schema({
    author: String, 
    comment: String, 
    timestamp: String, 
    postId: String
  })
)

// Middleware
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use(express.urlencoded({extended: true})); 
app.use(express.json()); 
app.use(bodyParser.json()); 

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];

  if (token) {
    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        console.error('JWT Verification Error', err.message);
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    console.error('Token is missing');
    res.sendStatus(401);
  }
};

// User registration
app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  // Sanitze and validate user input
  const sanitizedUsername = validator.escape(username);
  const sanitizedPassword = validator.escape(password);

  // Ensure valid input data
  if (!sanitizedUsername || !sanitizedPassword) {
    return res.status(400).send({ error: 'Invalid input data' });
  }

  const hashedPassword = await bcrypt.hash(sanitizedPassword, 10);

  const newUser = new User({
    username: sanitizedUsername,
    password: hashedPassword,
    role,
  });

  await newUser.save();
  res.status(201).send({ success: true });
});

// User login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Sanitze and validate user input
  const sanitizedUsername = validator.escape(username);
  const sanitizedPassword = validator.escape(password);

  // Ensure valid input data
  if (!sanitizedUsername || !sanitizedPassword) {
    return res.status(400).send({ error: 'Invalid input data' });
  }

  const user = await User.findOne({ username: sanitizedUsername }).then((user)=> {
    if (user) {

      const validPassword = (bcrypt.compare(sanitizedPassword, user.password)).then((result) => {
        if (result === true) {
          const accessToken = jwt.sign(
            { username: user.username, role: user.role },
            'super-secret-key-1234',
            {
              expiresIn: '24h',
            }
          );
          res
            .status(200)
            .send({ success: true, token: accessToken, role: user.role });
        } else {
          res.status(401).send({ success: false });
        }
      })
  
     
  
   
    } else {
      res.status(401).send({ success: false });
    }
  })
  

 
});

// Read all posts
app.get('/posts', async (req, res) => {
  const posts = await Post.find();
  res.status(200).send(posts);
});

app.get('/comments', async (req, res) => {
  const comments = await Comment.find(); 
  res.status(200).send(comments); 
})

app.post('/posts', authenticateJWT, async (req, res) => {
  if (req.user.role === 'admin') {
    const { title, content, imageUrl, author, timestamp } = req.body;

    const newPost = new Post({
      title,
      content,
      imageUrl,
      author,
      timestamp,
    });

    newPost
      .save()
      .then((savedPost) => {
        res.status(201).send(savedPost);
      })
      .catch((error) => {
        res.status(500).send({ error: 'Internal Server Error' });
      });
  } else {
    res.sendStatus(403);
  }
});

app.post('/comments', authenticateJWT, async (req, res) => {
  if (req.user.role == 'reader' || req.user.role == 'admin') {
    const { author, comment, timestamp, postId } = req.body; 

    console.log(author, comment, timestamp, postId); 

    const newComment = new Comment({
      author, 
      comment, 
      timestamp, 
      postId
    }); 

    newComment
      .save()
      .then((savedComment) => {
        res.status(201).send(savedComment); 
      })
      .catch((error) => {
        res.status(500).send({ error: 'Internal Server Error' }); 
      }); 
  } else {
    res.sendStatus(403); 
  }
})

app.get('/post/:id', async (req, res) => {
  const postId = req.params.id;
  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).send('Post not found');
  }

  // Read the HTML template from the file
  fs.readFile(path.join(__dirname, '/views/post-detail.pug'), 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Internal Server Error');
    }

    // Replace placeholders in th HTML with actual post data
    const postDetailHtml = data
      .replace(/\${post.imageUrl}/g, post.imageUrl)
      .replace(/\${post.title}/g, post.title)
      .replace(/\${post.timestamp}/g, post.timestamp)
      .replace(/\${post.author}/g, post.author)
      .replace(/\${post.content}/g, post.content);

      const html = pug.render(postDetailHtml, {}); 

      res.send(html); 
  });
});

// Delete post
app.delete('/posts/:id', authenticateJWT, async (req, res) => {
  if (req.user.role == 'admin') {
    try {
      await Post.findByIdAndDelete(req.params.id);
      res.status(200).send({ message: 'Post deleted' });
    } catch (error) {
      res.status(500).send({ error: 'Internal Server Error' });
    }
  } else {
    res.status(403).send({ error: 'Forbidden' });
  }
});

// Delete comment
app.delete('/comments/:id', authenticateJWT, async (req, res) => {
  const postId = req.params.id;
  console.log(postId);
  if (req.user.role == 'admin' || req.user.role == 'reader') {
    try {
      await Comment.findByIdAndDelete(postId);
      res.status(200).send({ message: 'Comment deleted' });
    } catch (error) {
      res.status(500).send({ error: 'Internal Server Error' });
    }
  } else {
    res.status(403).send({ error: 'Forbidden' });
  }
});

// Update Post
app.put('/posts/:id', authenticateJWT, async (req, res) => {
  const { title, content } = req.body;
  const postId = req.params.id;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).send({ error: 'Post not found' });
    }

    if (req.user.role === 'admin') {
      post.title = title;
      post.content = content;
      await post.save();
      res.status(200).send(post);
    } else {
      res.status(403).send({ error: 'Forbidden' });
    }
  } catch (error) {
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Update Comment
app.put('/comments/:id', authenticateJWT, async (req, res) => {
  const commentId = req.params.id;

  try {
    const comment = await Comment.findById(commentId);
    console.log(comment); 

    if (!comment) {
      return res.status(404).send({ error: 'Post not found' });
    }

    if (req.user.role === 'admin' || req.user.role === 'reader') {
      const { message } = req.body;
      console.log(message); 
      comment.comment = message;
      await comment.save();
      res.status(200).send(comment);
    } else {
      res.status(403).send({ error: 'Forbidden' });
    }
  } catch (error) {
    res.status(500).send({ error: 'Internal Server Error' });
  }
});