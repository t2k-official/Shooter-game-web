import { auth } from './../FIREBASE/firebase.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
const submitLogin = document.getElementById("submitLogin");
const errorText = document.getElementById("loginError");
window.onerror = function (msg, url, line, col, error) {
    console.log(`Error: `, msg, url, line, col, error)
}

async function login(email, password) {
  try{
    const user = await signInWithEmailAndPassword(auth, email, password)
    const success = 'true';
    return { user, success }
  } catch (err) {
    const fail = 'false';
    console.error(err);
    return { user: err, success: fail }
  }
}

submitLogin.onclick = async () => {
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    console.log(JSON.stringify({ username, password }))

    if (!username || !password) {
        alert("Please fill in all fields.");
        return;
    }
  const data = await login(username, password)
  if (data.success === 'false') {
    errorText.textContent = "Incorrect username or password";
    return;
  }
  if (data.success === 'true') {

    window.location.href = "main.html";
  } else {
    alert(data.error);
  }
};