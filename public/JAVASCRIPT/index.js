const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const guestButton = document.getElementById("guestBtn");

loginBtn.addEventListener("click", () => {
    window.location.href = "./../HTML/login.html";
});

signupBtn.addEventListener("click", () => {
    window.location.href = "./../HTML/signup.html";
});