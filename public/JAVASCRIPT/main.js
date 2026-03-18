import { auth } from "./../FIREBASE/firebase.js";
import { signOut, updateProfile, updatePassword, signInWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, query, where, doc, getDoc, setDoc, updateDoc, collection, getDocs, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.onerror = function (msg, url, line, col, error) {
    console.log(`Error: `, msg, url, line, col, error)
}

// ==========================
// FIREBASE/UI
// ==========================
const db = getFirestore();
let currentUser = null;
let username = null;
let userData = null;
let lastXP = -1;
let currentParty = []
let currentLeader = null
let sensitivity
let loadout

auth.onAuthStateChanged(async (user) => {

    if (!user) {
    window.location.href = "login.html";
        return;
    }

    currentUser = user;
    username = user.displayName;
    console.log(auth.currentUser)

    document.getElementById("usernameDisplay").textContent = username;

    updatePartyDisplay();
    await initialiseUserData();
    loadSensitivity();
    loadLoadout();
    await loadFriends();
    await loadPartyInvites();
    socket.emit("register", auth.currentUser.uid);
});

async function initialiseUserData(){

const userRef = doc(db,"users",currentUser.uid);
const snap = await getDoc(userRef);

if(!snap.exists()){

await setDoc(userRef,{
username: username,
level:1,
xp:0,
sensitivity:1,
loadout:"assault",
friends:[],
friendRequests:[],
sentRequests:[],
sentFriendRequests: [],
partyInvites:[]
});

}

await fetchUserData();

}

async function fetchUserData() {
    const user = auth.currentUser;
    if(!user) return;

    const docRef = doc(db, "users", user.uid)
    const snap = await getDoc(docRef);

    if(!snap.exists()) {
        await setDoc(docRef, {
            username: user.displayName,
            level: 1,
            xp: 0,
            sensitivity: 1,
            loadout: "assault",
            friends: [],
            friendRequests: [],
            sentRequests: [],
            sentFriendRequests: [],
            partyInvites: []
        });

        const snap2 = await getDoc(docRef);
        userData = snap2.data()
    } else {
        userData = snap.data()
    }
    updateUi();
}

function updateUi() {
    if(!userData) return;

    document.getElementById("usernameDisplay").textContent = userData.username;
    document.getElementById("levelDisplay").textContent = "lvl " + userData.level;
    const xpPercentage = (userData.xp / (1000 * userData.level)) * 100;
    document.getElementById("xpBar").style.width = xpPercentage + "%";
    document.getElementById("userUID").textContent = `UID: ${currentUser.uid}`
}

// ==========================
// LOADOUT
// ==========================
const loadoutBtn = document.getElementById("loadoutBtn");
const loadoutPopup = document.getElementById("loadoutPopup");
const loadoutOverlay = document.getElementById("loadoutOverlay");
const loadoutOptions = document.querySelectorAll(".loadout-option")
const closeLoadout = document.getElementById("closeLoadout");

loadoutBtn.onclick = () => {
    loadoutPopup.classList.add('active');
    loadoutOverlay.classList.add('active');
}

closeLoadout.onclick = () => {
    loadoutPopup.classList.remove('active');
    loadoutOverlay.classList.remove('active');
}

loadoutOptions.forEach(button => {
    button.addEventListener("click", async () => {
        loadoutOptions.forEach(btn => {
            btn.classList.remove("selected");
        })

        button.classList.add("selected");

        const option = button.dataset.loadout;

        const user = auth.currentUser;
        if(user) {
            const docRef = doc(db, "users", user.uid);
            await updateDoc(docRef, {
                loadout: option
            });
        }
    })
})

function loadLoadout() {
    if(!userData) return;
    const loadout = userData.loadout;
    const option = document.querySelector(`[data-loadout="${loadout}"]`)
    option.classList.add('selected');
}

// ==========================
// SETTINGS
// ==========================
const settingsBtn = document.getElementById("settingsBtn");
const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityValue = document.getElementById("sensitivityValue");
const closeSettings = document.getElementById("closeSettings");
const settingsOverlay = document.getElementById("settingsOverlay");
const settingsPopup = document.getElementById("settingsPopup");
const logoutBtn = document.getElementById("logoutBtn");
const manageAccountBtn = document.getElementById("manageAccountBtn");
const manageAccountPopup = document.getElementById("manageAccountPopup");
const closeManageAccountPopup = document.getElementById("closeManageAccountPopup");
const usernameChangeInput = document.getElementById("changeUsernameInput");
const confirmUsernameChange = document.getElementById('confirmUsernameChange');
const usernameChangeErrorText = document.getElementById("usernameChangeErrorText");
const passwordChangeInput = document.getElementById("changePasswordInput");
const passwordChangeInputOld = document.getElementById("changePasswordInputOld");
const confirmPasswordChange = document.getElementById('confirmPasswordChange');
const passwordChangeErrorText = document.getElementById("passwordChangeErrorText");
const deleteAccountText2 = document.getElementById("deleteAccountText2");
const deleteVerification = document.getElementById("deleteVerification");
const confirmDeleteAccount = document.getElementById('confirmDeleteAccount');
const deleteAccountErrorText = document.getElementById("deleteAccountErrorText");
const passwordDelete = document.getElementById('passwordDelete');
let verifyCode

settingsBtn.onclick = () => {
    settingsPopup.classList.add("active");
    settingsOverlay.classList.add("active");
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890-_.";
    const length = 10;
    let result = ""
    for(let i =0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    verifyCode = result
}

closeSettings.onclick = () => {
    settingsPopup.classList.remove("active");
    settingsOverlay.classList.remove("active");
}

logoutBtn.onclick = async () => {
    localStorage.clear();
    await signOut(auth)
    window.location.href = "index.html"
}

manageAccountBtn.onclick = () => {
    manageAccountPopup.classList.add("active")
    deleteAccountText2.textContent = `Verify Code: ${verifyCode}`
}

closeManageAccountPopup.onclick = () => {
    manageAccountPopup.classList.remove("active")
}

confirmUsernameChange.onclick = async () => {
    const newUsername = usernameChangeInput.value;
    const username = auth.currentUser.displayName;

    if(newUsername === username) {
        return usernameChangeErrorText.textContent = `Your New Username Can Not Be The Same As Your Old Username: ${newUsername}`;
    }
    if(!newUsername || newUsername === null) {
        return usernameChangeErrorText.textContent = `You Must Enter A New Username`;
    }
    if(newUsername.length < 3 || newUsername.length > 15) {
        return usernameChangeErrorText.textContent = `Your New Username Must Be Between 3 And 15 Characters`
    }
    else {
        const docRef = doc(db, "users", auth.currentUser.uid)
        await updateProfile(auth.currentUser, {
            displayName: newUsername
        })
        await updateDoc(docRef, {
            username: newUsername
        })
        alert('Name Change Complete Please Login...')
        await signOut(auth)
        localStorage.clear(userData)
        window.location.href = "login.html"
    }
}

confirmPasswordChange.onclick = async () => {
    const newPassword = passwordChangeInput.value;
    const oldPassword = passwordChangeInputOld.value;
    const email = auth.currentUser.email;
    try {
        await signInWithEmailAndPassword(auth, email, oldPassword)
    } catch(err) {
        if(err.code === 'auth/invalid-credential') {
            return passwordChangeErrorText.textContent = `Your Password Is Incorrect. Try Again`
        } else{
            console.error(err)
            passwordChangeErrorText.textContent = `An Error Occoured. Try Again`
        }
    }
    await updatePassword(auth.currentUser, newPassword)
    alert('Password Change Complete Please Login...')
    await signOut(auth)
    localStorage.clear(userData)
    window.location.href = "login.html"
}

confirmDeleteAccount.onclick = async () => {
    const inputCode = deleteVerification.value;
    const password = passwordDelete.value;
    const email = auth.currentUser.email;
    if(inputCode !== verifyCode) {
        return deleteAccountErrorText.textContent = `The Verify Code Is Incorrect. Try Again`
    }
    try {
        await signInWithEmailAndPassword(auth, email, password)
    } catch(err) {
        if(err.code === 'auth/invalid-credential') {
            return deleteAccountErrorText.textContent = `Your Password Is Incorrect. Try Again`
        } else{
            console.error(err)
            deleteAccountErrorText.textContent = `An Error Occoured. Try Again`
        }
    }
    const uid = auth.currentUser.uid;
    console.log(uid)
    const snap = await getDocs(collection(db, "users"));
    snap.forEach(async (userDoc) => {
        const userRef = doc(db, "users", userDoc.id);
        await updateDoc(userRef, {
            friends: arrayRemove(uid)
        });
    })
    await deleteDoc(doc(db, "users", uid));
    await deleteUser(auth.currentUser)
    alert('Account Deleted')
    await signOut(auth)
    localStorage.clear()
    localStorage.clear()
    window.location.href = "index.html"
}

sensitivitySlider.addEventListener("input", async () => {
    const value = parseFloat(sensitivitySlider.value).toFixed(2);
    sensitivityValue.textContent = value;

    const user = auth.currentUser;
    if(user) {
        const docRef = doc(db, "users", user.uid);
        await updateDoc(docRef, {
            sensitivity: parseFloat(value)
        });
    }
})

function loadSensitivity() {
    if(!userData) return;
    const sens = userData.sensitivity
    document.getElementById("sensitivitySlider").value = sens;
}

// ==========================
// FRIENDS/PARTY
// ==========================
const inviteBtn = document.getElementById("inviteBtn");
const friendsOverlay = document.getElementById("friendsOverlay");
const friendsPopup = document.getElementById("friendsPopup");
const closeFriends = document.getElementById("closeFriends");
const friendRequestsBtn = document.getElementById("friendRequestsBtn");
const addFriendBtn = document.getElementById("addFriendBtn");
const requestsPopup = document.getElementById("requestsPopup");
const addFriendPopup = document.getElementById("addFriendPopup");
const closeRequests = document.getElementById("closeRequests");
const closeAddFriend = document.getElementById("closeAddFriend");
const friendsList = document.getElementById("friendsList");
const requestsList = document.getElementById("requestsList");
const searchInput = document.getElementById("searchUsername");
const searchResults = document.getElementById("searchResults");
const partyInvitesList = document.getElementById("partyInvitesList");

inviteBtn.onclick = () => {
    friendsOverlay.classList.add("active");
    friendsPopup.classList.add("active");
    loadFriends();
    loadPartyInvites();
};

closeFriends.onclick = closeAllFriendPopups;

friendsOverlay.onclick = closeAllFriendPopups;

function closeAllFriendPopups(){
    friendsOverlay.classList.remove("active");
    friendsPopup.classList.remove("active");
    requestsPopup.classList.remove("active");
    addFriendPopup.classList.remove("active");
}

friendRequestsBtn.onclick = () => {
    requestsPopup.classList.add("active");
    loadFriendRequests();
};

closeRequests.onclick = () => {
    requestsPopup.classList.remove("active");
};

addFriendBtn.onclick = () => {
    addFriendPopup.classList.add("active");
};

closeAddFriend.onclick = () => {
    addFriendPopup.classList.remove("active");
};

const socket = io("https://shooter-game-web.onrender.com");

async function loadPartyInvites(){
    partyInvitesList.innerHTML="";
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const invites = snap.data().partyInvites || [];
    if(invites.length === 0){
        partyInvitesList.innerHTML=`
        <p style="color:#aaa;font-weight:bold;text-align:center;">
        You Have No New Invites
        </p>`;
        return;
    }
    invites.forEach(async (inviter) => {
        const docRef = doc(db, "users", inviter)
        const docSnap = await getDoc(docRef);
        const inviterId = docSnap.id
        const inviterData = docSnap.data()
        const div = document.createElement("div");
        div.classList.add("friend-item");
        div.innerHTML=`
        <div class="friend-info">
        <img src="../ASSETS/IMAGES/PROFILE/default.png">
        <span>${inviterData.username}</span>
        </div>
        <div>
        <button class="green-btn join-btn">Join</button>
        <button class="red-btn ignore-btn">Ignore</button>
        </div>
        `;
        div.querySelector(".join-btn").onclick = async ()=>{
            console.log(inviter)
            socket.emit("acceptPartyInvite", inviter);
            const userRef = doc(db,"users",currentUser.uid);
            const snap = await getDoc(userRef);
            let data = snap.data();
            data.partyInvites =
            data.partyInvites.filter(i=>i!==inviter);
            await updateDoc(userRef,data);
            loadPartyInvites();
        };
    div.querySelector(".ignore-btn").onclick = async ()=>{
    const userRef = doc(db,"users",currentUser.uid);
    const snap = await getDoc(userRef);
    let data = snap.data();
    data.partyInvites =
    data.partyInvites.filter(i=>i!==inviter);
    await updateDoc(userRef,data);
        loadPartyInvites();
    };

    partyInvitesList.appendChild(div);

});

}

async function removeFriend(friend) {
    console.log(friend)
    const docRef = doc(db, "users", auth.currentUser.uid)
    const docSnap = await getDoc(docRef)
    const friendRef = doc(db, "users", friend)
    const friendSnap = await getDoc(friendRef)
    if(friendSnap.empty) {
        return console.error('Couldnt find user with that name')
    }
    else {
        const friendUid = friendSnap.id;
        const friendsList = friendSnap.data().friends;
        const myList = docSnap.data().friends;
        const newFriendsList = friendsList.filter(f => f !== auth.currentUser.uid)
        const newMyList = myList.filter(f => f !== friendUid);
        await updateDoc(friendRef, {
            friends: newFriendsList
        })
        await updateDoc(docRef, {
            friends: newMyList
        });
        loadFriends()
    }
}

socket.on("partyInvite", async (data)=>{
    console.log(data)
    const inviter = data.from;
    const userRef = doc(db,"users", currentUser.uid);
    const snap = await getDoc(userRef);
    let userData = snap.data();
    if(!userData.partyInvites.includes(inviter)){
        userData.partyInvites.push(snap.id);
        await updateDoc(userRef,{
            partyInvites:userData.partyInvites
        });
    }
    loadPartyInvites();
});

async function loadFriends(){
    friendsList.innerHTML="";
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const friends = snap.data().friends || [];
    console.log(friends)
    if(friends.length === 0){
        friendsList.innerHTML=`
        <p style="color:#aaa;font-weight:bold;text-align:center;">
        You currently have no friends add them to start playing
        </p>
        `;
        return;
    }
    friends.forEach(async (friend) =>{
        console.log(auth.currentUser.id)
        console.log(friend)
        const docRef = doc(db, "users", friend)
        const docSnap = await getDoc(docRef)
        const friendUsername = docSnap.data().username;
        const div = document.createElement("div");
        div.classList.add("friend-item");
        div.innerHTML=`
        <div class="friend-info">
        <img src="../ASSETS/IMAGES/PROFILE/default.png">
        <span>${friendUsername}</span>
        </div>
        <div class="friend-actions">
        <button class="blue-btn invite-btn">Invite</button>
        <button class="orange-btn remove-btn">Remove</button>
        </div>
        `;
        div.querySelector(".invite-btn").onclick=()=>{
            console.log('test')
            socket.emit("inviteToParty", friend);
        };
        div.querySelector(".remove-btn").onclick=()=>{
        removeFriend(friend);
        };
        friendsList.appendChild(div);
    });
}

async function loadFriendRequests(){
    requestsList.innerHTML="";
    const snap = await getDoc(doc(db,"users",currentUser.uid));
    const requests = snap.data().friendRequests || [];
    if(requests.length === 0){
        requestsList.innerHTML=`
        <p style="color:#aaa;font-weight:bold;text-align:center;">
        No pending friend requests
        </p>
        `;
        return;
    }
    requests.forEach(async (requester) => {
        const docRef = doc(db, "users", requester)
        const docSnap = await getDoc(docRef)
        const requesterId = docSnap.id;
        const requesterData = docSnap.data()
        const div = document.createElement("div");
        div.classList.add("friend-item");
        div.innerHTML=`
        <div class="friend-info">
        <img src="../ASSETS/IMAGES/PROFILE/default.png">
        <span>${requesterData.username}</span>
        </div>
        <div>
        <button class="green-btn accept-btn">Add</button>
        <button class="red-btn ignore-btn">Ignore</button>
        </div>
        `;
        div.querySelector(".accept-btn").onclick=async()=>{
            const userRef = doc(db, "users", currentUser.uid);
            const otherRef = doc(db, "users", requesterId)
            const snap = await getDoc(userRef);
            let data = snap.data();
            const myUid = snap.id;
            data.friendRequests = data.friendRequests.filter(r=>r!==requesterId);
            data.friends.push(requesterId);
            await updateDoc(userRef, data);
            loadFriendRequests();
            loadFriends();
            requesterData.sentFriendRequests = requesterData.sentFriendRequests.filter(r=>r!=myUid)
            requesterData.friends.push(myUid)
            await updateDoc(otherRef, requesterData)
        };
        div.querySelector(".ignore-btn").onclick=async()=>{
            const userRef = doc(db,"users",currentUser.uid);
            const otherRef = doc(db, "users", requesterId)
            const snap = await getDoc(userRef);
            let data = snap.data();
            data.friendRequests =
            data.friendRequests.filter(r=>r!==requesterId);
            await updateDoc(userRef, data);
            loadFriendRequests();
            requesterData.sentFriendRequests = requesterData.sentFriendRequests.filter(r=>r!=snap.id)
            await updateDoc(otherRef, requesterData)
        };
        requestsList.appendChild(div);
    });

}
let partyLeader = null;
const partyTitle = document.getElementById("partyTitle");
const partySlots = document.querySelectorAll(".party-slot");
const leavePartyBtn = document.getElementById("leave-party");
leavePartyBtn.style.display = 'none';

async function updatePartyDisplay() {
    if(currentParty.length < 1 || currentLeader === null) {
        currentParty = [auth.currentUser.uid]
        currentLeader = auth.currentUser.uid
    }
    partyTitle.textContent = `Party ${currentParty.length}/5`;
    partySlots.forEach(slot => {
        slot.innerHTML="";
     });

     for(let i=0; i<5; i++) {
        const slot = partySlots[i];
        if(i < currentParty.length) {
            const memberId = currentParty[i];
            const docRef = doc(db, "users", memberId)
            const docSnap = await getDoc(docRef)
            const member = docSnap.data().username;
            const crown = memberId === currentLeader ? "👑" : "";
            const image = '../ASSETS/IMAGES/PROFILE/default.png'
            slot.innerHTML = 
            `<img src="${image}">
            <span>${member}${crown}</span>`;
        } else {
            slot.innerHTML = 
            `<span class="empty-slot">Invite Friends</span>`;
        }
     }

     leavePartyBtn.style.display = currentParty.length>1 ? "block" : "none";
}

socket.on("joinedParty", (party) => {
    currentParty = party.members;
    currentLeader = party.leader;
    updatePartyDisplay()
});

socket.on("partyUpdate", (party) => {
    currentParty = party.members;
    currentLeader = party.leader;
    updatePartyDisplay();
});

socket.on("partyInviteAccepted", (party) => {
    currentParty = party.members;
    currentLeader = party.leader;
    updatePartyDisplay();
})

leavePartyBtn.onclick = () => {
    socket.emit("leaveParty");
};

searchInput.oninput = async ()=>{
    const Ref = doc(db, "users", auth.currentUser.uid)
    const snap = await getDoc(Ref);
    let myData = snap.data();
    const value = searchInput.value.toLowerCase();
    searchResults.innerHTML="";
    if(!value) return;
    const q = query(collection(db, "users"), where("username", "==", value))
    const data = await getDocs(q)
    if(data.empty) {
    } else {
        data.forEach((userDoc) => {
            const info = userDoc.data();
            const infoUid = userDoc.id;
            let sentFR = myData.sentFriendRequests || []
            if(!sentFR.includes(info.username)) {
                const div = document.createElement("div");
                div.classList.add("friend-item");
                div.innerHTML=`
                <div class="friend-info">
                <img src="../ASSETS/IMAGES/PROFILE/default.png">
                <span>${info.username}</span>
                </div>
                <button class="orange-btn send-request-btn">
                Send Request
                </button>
                `;
                div.querySelector(".send-request-btn").onclick =
                async ()=>{
                    const targetRef = doc(db, "users", infoUid);
                    const targetSnap = await getDoc(targetRef);
                    let targetData = targetSnap.data();
                    targetData.friendRequests.push(auth.currentUser.uid);
                    sentFR.push(infoUid)
                    await updateDoc(targetRef,{
                        friendRequests: targetData.friendRequests
                    });
                    await updateDoc(Ref, {
                        sentFriendRequests: sentFR
                    })

                    div.remove();
                };
                searchResults.appendChild(div);
            }
        });
    };
};