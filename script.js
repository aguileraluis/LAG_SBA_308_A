let storedToken = localStorage.getItem('jwtToken'); 
let storedUsername = localStorage.getItem('username'); 

const usernameElement = document.getElementById('username'); 
usernameElement.textContent = storedUsername; 

document.addEventListener('DOMContentLoaded', () => {
  const baseUrl = window.location.origin; 
  fetchPosts(baseUrl); 

  if (storedToken) {
    const storedRole = localStorage.getItem('userRole'); 
    if (storedRole == 'admin') {
      showAdminFeatures(); 
    }
  }

  const form = document.getElementById('new-post-form'); 
  if (form) {
    form.addEventListener('submit', (event) => createPost(event, baseUrl)); 
  }

  const loginForm = document.getElementById('login-form'); 
  loginForm.addEventListener('submit', (event) => loginUser(event, baseUrl));

  const registerForm = document.getElementById('register-form'); 
  registerForm.addEventListener('submit', (event) => registerUser(event, baseUrl));
}); 

const postDetailContainer = document.getElementById('post-detail-container'); 

postDetailContainer.addEventListener('load', () => {
  const urlParams = new URLSearchParams(window.location.search); 
  const postId = urlParams.get('post'); 

  if (postId) {
    showPostDetail(postId); 
  }
})

async function fetchPosts(baseUrl) {
  const res = await fetch(`${baseUrl}/posts`); 
  const data = await res.json(); 
  const postsList = document.getElementsById('posts-list'); 
  const isAdmin = localStorage.getItem('userRole') === 'admin'; 

  if (postsList) {
    postsList.innerHTML = data
    .map((post, index) => {
      const deleteButtonStyle = isAdmin ? '' : 'display: none'; 
      const updateButtonStyle = isAdmin ? '' : 'display: none'; 

      return `
         <div id=${post._id} class="post">
        <img src=${post.imageUrl} alt="Image"/>
        <div class="post-title">
        ${
          index === 0
          ? `<h1><a href="/post/${post._id}">${post.title}</a></h1>`
          : `<h3><a href="post/${post._id}">${post.title}</a></h3>`
        }
      </div>
      ${
        index === 0
        ? `<span><p>${post.author}</p><p>${post.timestamp}</p></span>`
        : ''
      }
      
      <div id="admin-buttons">
        <button class="btn" style="${deleteButtonStyle} onclick="deletePost('${post._id}', '${baseUrl}')">Delete</button>
        <button class="btn" style="${deleteButtonStyle} onclick="showUpdateForm('${post._id}', '${post.title}', ${post.content}')">Update</button>
      </div>
      ${index === 0 ? '<hr>' : ''} 
      ${index === 0 ? '<h2>All Articles</h2>' : ''} 
    </div>
      `
    }).join(''); 
  }
}

async function createPost(event, baseUrl) {
  event.preventDefault(); 
  const titleInput = document.getElementById('title'); 
  const contentInput = document.getElementById('content'); 
  const imageUrlInput = document.getElementById('image-url'); 

  const title = titleInput.value; 
  const content = contentInput.value; 
  const imageUrl = imageUrlInput.value; 

  if (!title || !content || !imageUrl) {
    alert('Please fill in all fields.'); 
    return;
  }

  const newPost = {
    title, 
    content, 
    imageUrl, 
    author: storedUsername, 
    timestamp: new Date().toLocaleDateString(undefined, {
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    })
  }; 

  const headers = new Headers({
    'Content-Type': 'application/json', 
    Authorization: `Bearer ${storedToken}`
  }); 
  const requestOptions = {
    method: 'POST', 
    headers: headers,
    body: JSON.stringify(newPost)
  }; 

  try {
    const response = await fetch(`${baseUrl}/posts`, requestOptions)
    if (!response.ok) {
      const storedRole = localStorage.getItem('userRole'); 
      console.log(`Error creating the Post: HTTP Status ${response.status}`); 
    } else {
      titleInput.value = ''; 
      contentInput.value = ''; 
      imageUrlInput.value = ''; 
      alert('Create post successful!'); 
    }
  } catch (error) {
    console.log('An error occured fetching your data:', error); 
    alert('Create post failed.'); 
  }
  fetchPosts(baseUrl); 
}

async function deletePost(postId, baseUrl) {
  const deleteUrl = `${baseUrl}/posts/${postId}`; 
  try {
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${storedToken}`, 
      },
    }); 
    if (response.ok) {
      alert('Delete post successful!'); 
      fetchPosts(baseUrl); 
    } else {
      alert('Delete post failed.'); 
    }
  } catch (error) {
    console.error(`Error while deleting post: ${error}`); 
    alert('Delete post failed.')
  }
}

function showUpdateForm(postId, title, content) {
  const updateForm = `
  <form id=${update-form}>
  <input type="text" id="update-title" value="${title}" />
  <textarea id="update-content">${content}</textarea>
  <button type="submit">Update Post</button>
  </form>
  `; 

  const postElement = document.getElementById(postId); 
  postElement.innerHTML += updateForm; 

  const form = document.getElementById('update-form'); 
  form.addEventListener('submit', (event) => updateForm(event, postId)); 
}

async function updatePost(event, postId) {
  event.preventDefault(); 
  const title = document.getElementById('update-title').value; 
  const content = document.getElementById('update-content').value; 
  const baseUrl = window.location.origin; 

  if (!title || !content) {
    alert('Please fill in all fields.'); 
    return;
  }

  const updatedPost = {
    title, 
    content
  }; 

  try {
    const response = await fetch(`${baseUrl}/posts/${postId}`, {
      method: 'PUT', 
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storedToken}`,
      }, 
      body: JSON.stringify(updatePost)
    }); 

    if (response.ok) {
      alert('Update post successful!'); 
      fetchPosts(baseUrl); 
    } else {
      alert('Update post failed.'); 
    }
  } catch (error) {
    console.error('An error occured during the fetch', error); 
    alert('Update post failed'); 
  }
}

async function registerUser(event, baseUrl) {
  event.preventDefault(); 
  const usernameInput = document.getElementById('register-username'); 
  const passwordInput = document.getElementById('register-password'); 
  const roleInput = document.getElementById('register-role'); 

  const username = usernameInput.value; 
  const password = usernameInput.value; 
  const role = usernameInput.value; 

  if (!username || !password || !role) {
    alert('Please fill in all fields.'); 
    return;
  }

  const newUser = {
    username, 
    password, 
    role
  }; 

    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      }, 
      body: JSON.stringify(newUser)
    }); 

    const data = await res.json()

    if (data.success) {
      alert('Registered Successfully!'); 
      usernameInput.value = ''; 
      passwordInput.value = ''; 
      roleInput.value = ''; 
    } else {
      alert('Registration failed.'); 
    }
}

async function loginUser(event, baseUrl) {
  event.preventDefault(); 
  const usernameInput = document.getElementById('login-username').value; 
  const passwordInput = document.getElementById('login-password').value; 

  const username = usernameInput.value; 
  const password = usernameInput.value; 

  if (!username || !password) {
    alert('Please fill in all fields.'); 
    return;
  }

  const user = {
    username, 
    password
  }; 

    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      }, 
      body: JSON.stringify(user)
    }); 

    const data = await res.json(); 

    if (data.success) {
      localStorage.setItem('jwtToken', data.token); 
      localStorage.setItem('userRole', data.role); 
      localStorage.setItem('username', username); 
      
      linksContainer.classList.toggle('active'); 
      hamburger.classList.toggle('active'); 

      usernameInput.value = ''; 
      passwordInput.value = ''; 
      
      location.reload(); 

      if (data.role === 'admin') {
        showAdminFeatures(); 
      }
     } else {
        alert('Login failed.'); 
    }
}

function showAdminFeatures() {
  const newPostDiv = document.getElementById('new-post-div'); 
  if (newPostDiv) {
    newPostDiv.style.display = "flex"; 
  }

  const allBtns = document.querySelectorAll('.btn'); 

  allBtns.forEach((btn) => {
    if (btn) {
      btn.style.display = 'block'; 
    }
  }); 
}

document.addEventListener('DOMContentLoaded', () => {
  const baseUrl = window.location.origin; 
  const registerDiv = document.getElementById('register-div'); 
  const loginDiv = document.getElementById('login-div'); 
  const logoutDiv = document.getElementById('logout-div'); 
  const logoutButton = document.getElementById('logout-button'); 

  if (storedToken) {
    registerDiv.style.display = 'none'; 
    loginDiv.style.display = 'none'; 
    logoutDiv.style.display = 'flex'; 
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('jwtToken'); 
      localStorage.removeItem('userRole'); 
      localStorage.removeItem('username'); 
      location.reload(); 
     }); 
  } else {
    registerDiv.style.display = 'flex'; 
    loginDiv.style.display = 'flex'; 
    logoutDiv.style.display = 'none'; 
  }
})

