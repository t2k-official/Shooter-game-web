const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const guestButton = document.getElementById("guestBtn");

loginBtn.addEventListener("click", () => {
    window.location.href = "login.html";
});

signupBtn.addEventListener("click", () => {
    window.location.href = "signup.html";
});