// =========================
// IMPORTS
// =========================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// =========================
// USER SCHEMA
// =========================
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  sensitivity: { type: Number, default: 1 },
  loadout: { type: String, default: "assault" },
  friends: { type: [String], default: [] },
  friendRequests: { type: [String], default: [] },
  sentRequests: { type: [String], default: [] },
  partyInvites: { type: [String], default: [] },
  uid: String
});

const User = mongoose.model("User", userSchema);

// =========================
// AUTH ROUTES
// =========================
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const uid = username + "-" + Math.random().toString(36).substring(2, 8);

  try {
    const newUser = await User.create({
      username,
      password,
      uid
    });
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.json({ success: false, error: "User not found" });
  if (user.password !== password) return res.json({ success: false, error: "Wrong password" });

  res.json({ success: true, user });
});

app.get("/user/:username", async (req, res) => { 
  const user = await User.findOne({ username: req.params.username });
  if (!user) return res.json({ success: false, error: "User not found" }); 
  res.json({ success: true, user }); });

// =========================
// XP SYSTEM
// =========================
app.post("/updateXP", async (req, res) => {
  const { username, amount } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.json({ success: false });

  user.xp += amount;

  while (user.xp >= user.level * 1000) {
    user.xp -= user.level * 1000;
    user.level += 1;
  }

  await user.save();
  res.json({ success: true, user });
});

// =========================
// SETTINGS
// =========================
app.post("/getSettings", async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  res.json({ sensitivity: user?.sensitivity || 1 });
});

app.post("/updateSettings", async (req, res) => {
  await User.updateOne(
    { username: req.body.username },
    { $set: { sensitivity: req.body.sensitivity } }
  );
  res.json({ success: true });
});

// =========================
// LOADOUT
// =========================
app.post("/updateLoadout", async (req, res) => {
  await User.updateOne(
    { username: req.body.username },
    { $set: { loadout: req.body.loadout } }
  );
  res.json({ success: true });
});

app.post("/getLoadout", async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  res.json({ loadout: user?.loadout || "assault" });
});

// =========================
// FRIEND SYSTEM
// =========================
// ==========================
// SEARCH USERS
// ==========================
app.post("/searchUsers", async (req, res) => {
    const { search, currentUser } = req.body;
    if (!search || !currentUser)
        return res.json({ users: [] });
    const user = await User.findOne({ username: currentUser });
    if (!user)
        return res.json({ users: [] });
    const users = await User.find({
        username: { $regex: search, $options: "i" },
        username: {
            $nin: [
                currentUser,
                ...user.friends,
                ...user.sentRequests,
                ...user.friendRequests
            ]
        }
    })
    .limit(10)
    .select("username");
    res.json({ users });
});


// ==========================
// SEND FRIEND REQUEST
// ==========================
app.post("/sendFriendRequest", async (req, res) => {
    const { from, to } = req.body;
    if (!from || !to || from === to)
        return res.json({ success: false });
    const target = await User.findOne({ username: to });
    const sender = await User.findOne({ username: from });
    if (!target || !sender)
        return res.json({ success: false });
    if (
        target.friendRequests.includes(from) ||
        target.friends.includes(from)
    ) {
        return res.json({ success: false });
    }
    target.friendRequests.push(from);
    sender.sentRequests.push(to);
    await target.save();
    await sender.save();
    res.json({ success: true });
});


// ==========================
// ACCEPT FRIEND
// ==========================
app.post("/acceptFriend", async (req, res) => {
    const { user, requester } = req.body;
    const current = await User.findOne({ username: user });
    const other = await User.findOne({ username: requester });
    if (!current || !other)
        return res.json({ success: false });
    current.friendRequests =
        current.friendRequests.filter(u => u !== requester);
    current.friends.push(requester);
    other.friends.push(user);
    await current.save();
    await other.save();
    res.json({ success: true });
});


// ==========================
// IGNORE FRIEND
// ==========================
app.post("/ignoreFriend", async (req, res) => {
    const { user, requester } = req.body;
    const current = await User.findOne({ username: user });
    const other = await User.findOne({ username: requester });
    if (!current || !other)
        return res.json({ success: false });
    current.friendRequests =
        current.friendRequests.filter(u => u !== requester);
    other.sentRequests =
        other.sentRequests.filter(u => u !== user);
    await current.save();
    await other.save();
    res.json({ success: true });
});


// ==========================
// GET FRIENDS
// ==========================
app.post("/getFriends", async (req, res) => {
    const user = await User.findOne({
        username: req.body.username
    });
    if (!user)
        return res.json({ friends: [] });
    res.json({ friends: user.friends });
});


// ==========================
// GET FRIEND REQUESTS
// ==========================
app.post("/getFriendRequests", async (req, res) => {
    const user = await User.findOne({
        username: req.body.username
    });
    if (!user)
        return res.json({ requests: [] });
    res.json({ requests: user.friendRequests });
});
app.post("/removeFriend", async (req, res) => {
  const { user, friend } = req.body;

  const current = await User.findOne({ username: user });
  const other = await User.findOne({ username: friend });

  if (!current || !other) return res.json({ success: false });

  current.friends = current.friends.filter(f => f !== friend);
  other.friends = other.friends.filter(f => f !== user);

  await current.save();
  await other.save();

  res.json({ success: true });
});

// =========================
// LIVE PARTY SYSTEM (SOCKET.IO)
// =========================

const parties = {};        // leaderUsername -> party object
const userSockets = {};    // username -> socket.id

io.on("connection", (socket) => {

  // =========================
  // REGISTER USER
  // =========================
  socket.on("register", (username) => {
    socket.username = username;
    userSockets[username] = socket.id;
  });

  // =========================
  // CREATE PARTY
  // =========================
  socket.on("createParty", () => {

    const username = socket.username;
    if (!username) return;

    // Prevent duplicate party
    if (getUserParty(username)) return;

    parties[username] = {
      leader: username,
      members: [username]
    };

    socket.emit("partyUpdate", parties[username]);
  });

  // =========================
  // INVITE TO PARTY
  // =========================
  socket.on("inviteToParty", (targetUsername) => {
    const inviter = socket.username;
    if (!inviter) return
    let party = getUserParty(inviter);
    if (!party) {
        parties[inviter] = {
            leader: inviter,
            members: [inviter]
        };
        party = parties[inviter];
        broadcastParty(party);
    }
    if (party.members.length >= 5) return;
    if (getUserParty(targetUsername)) return;
    const targetSocketId = userSockets[targetUsername];
    if (!targetSocketId) return;
    io.to(targetSocketId).emit("partyInvite", {
      from: inviter
    });
  });

  // =========================
  // ACCEPT PARTY INVITE
  // =========================
  socket.on("acceptPartyInvite", (leaderUsername) => {
    const username = socket.username;
    console.log('test')
    if (!username) return;
    const party = parties[leaderUsername];
    console.log(leaderUsername)
    console.log(parties)
    if (!party) return;
    console.log('test')

    if (party.members.length >= 5) return;

    // Prevent joining multiple parties
    if (getUserParty(username)) return;

    party.members.push(username);
    console.log('test1')
    broadcastParty(party);
  });

  // =========================
  // LEAVE PARTY
  // =========================
  socket.on("leaveParty", () => {
    removeUserFromParty(socket.username);
  });

  // =========================
  // DISCONNECT AUTO-LEAVE
  // =========================
  socket.on("disconnect", () => {

    const username = socket.username;

    if (username) {
      delete userSockets[username];
      removeUserFromParty(username);
    }
  });

});


// =========================
// HELPER FUNCTIONS
// =========================

function getUserParty(username) {
  for (let leader in parties) {
    if (parties[leader].members.includes(username)) {
      return parties[leader];
    }
  }
  return null;
}

function broadcastParty(party) {

  party.members.forEach(member => {
    const id = userSockets[member];
    if (id) {
      io.to(id).emit("partyUpdate", party);
    }
  });
}

function removeUserFromParty(username) {

  for (let leader in parties) {

    const party = parties[leader];

    if (party.members.includes(username)) {

      party.members =
        party.members.filter(m => m !== username);

        // Tell the user who left that they are now solo
      const leftUserSocket = userSockets[username];
      if (leftUserSocket) {
          io.to(leftUserSocket).emit("partyUpdate", {
              leader: username,
              members: [username]
          });
      }

      // If empty → delete party
      if (party.members.length === 0) {
        delete parties[leader];
        return;
      }

      // If leader left → promote first member
      if (party.leader === username) {

        const newLeader = party.members[0];
        party.leader = newLeader;

        parties[newLeader] = party;
        delete parties[leader];
      }

      broadcastParty(party);
      return;
    }
  }
}
// =========================
// START SERVER
// =========================
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});