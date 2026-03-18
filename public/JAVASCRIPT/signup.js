import { auth } from "./../FIREBASE/firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
const submitSignup = document.getElementById("submitSignup");
window.onerror = function (msg, url, line, col, error) {
    console.log(`Error: `, msg, url, line, col, error)
}

async function signUp(username, password, email) {
    try {
        const user = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(user.user, {
            displayName: username
        })
        const success = 'true'
        return { user, success }
    } catch (err) {
        console.error(err)
        const fail = 'false'
        return { user: err, success: fail }
    }
}

submitSignup.onclick = async () => {
    const username = document.getElementById("signupUsername").value;
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;
    const passwordConfirm = document.getElementById("signupPasswordConfirm").value;

    if (!username || !password || !passwordConfirm || !email) {
        alert("Please fill in all fields.");
        return;
    }

    if (password !== passwordConfirm) {
        alert("Passwords do not match.");
        return;
    }

    try {
        const data = await signUp(username, password, email)
        if (data.success === 'true') {

            window.location.href = "main.html";
        } else {
            alert("Signup failed: " + data.user);
        }
    } catch (err) {
        console.error("Signup error:", err);
        alert("An error occurred. Try again.");
    }
};