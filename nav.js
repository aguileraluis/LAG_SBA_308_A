const hamburger = document.querySelector('.nav__hamburger'); 
const linksContainer = document.querySelector('.nav__menu'); 

if (hamburger) {
  hamburger.addEventListener('click', () => {
    linksContainer.classList.toggle('active'); 
    hamburger.classList.toggle('active'); 
  }); 
}




