// ==========================
// THREE.JS BASIC SETUP
// ==========================
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js"

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
75,
window.innerWidth / window.innerHeight,
0.1,
1000
);

const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// ==========================
// VARIBLES/FUNCTIONS
// ==========================
const regularKillMessages = [
    'killed',
    'eliminated',
    'outplayed'
]
const explodedKillMessages = [
    'exploded'
]

const knifeKillMessages = [
    'stabbed'
]

function getKillMessage(r) {
    if(r === 'Knife') {
        return knifeKillMessages[Math.floor(Math.random()*knifeKillMessages.length)];
    }
    if(r === 'Explosive') {
        return explodedKillMessages[Math.floor(Math.random()*explodedKillMessages.length)];
    }
    else {
        return regularKillMessages[Math.floor(Math.random()*regularKillMessages.length)];
    }
}

function addKillFeed(killer, victim) {
    const feed = document.getElementById("killFeed");
    const message = document.createElement("div")
    message.className = "killMessage";
    const cause = 'testing';
    const killWord = getKillMessage(cause);
    message.innerHTML = `${killer} ${killWord} ${victim}`;
    feed.appendChild(message);
    setTimeout(() => {
        message.style.opacity = 0;
        setTimeout(() => {
            feed.removeChild(message);
        }, 500);
    }, 4000);
}
// ==========================
// LIGHTING
// ==========================

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(10,20,10);
scene.add(light);

scene.add(new THREE.AmbientLight(0xffffff,0.5));


// ==========================
// GROUND
// ==========================

const ground = new THREE.Mesh(
new THREE.PlaneGeometry(200,200),
new THREE.MeshStandardMaterial({color:0x2d8f2d})
);

ground.rotation.x = -Math.PI/2;
scene.add(ground);


// ==========================
// CREATE EGG PLAYER
// ==========================

function createPlayer(color){

const group = new THREE.Group();

const material = new THREE.MeshStandardMaterial({
color: color
});

const points = [];

for(let deg = 0; deg <= 180; deg += 6) {

    const radius = Math.PI * deg / 180;

    const point = new THREE.Vector2(
        (0.72 + .08 * Math.cos(radius)) * Math.sin(radius),
        -Math.cos(radius)
    );

    points.push(point);

}

const geometry = new THREE.LatheGeometry(points,32);
geometry.computeVertexNormals();

const egg = new THREE.Mesh(geometry,material);
egg.scale.set(2,2,2);
egg.position.y = 2;

group.add(egg);


// ===== FACE =====

const faceMat = new THREE.MeshBasicMaterial({color:0x000000});

const eye1 = new THREE.Mesh(
new THREE.SphereGeometry(0.15,16,16),
faceMat
);

eye1.position.set(-0.35,2.4,1.2);
group.add(eye1);

const eye2 = new THREE.Mesh(
new THREE.SphereGeometry(0.15,16,16),
faceMat
);

eye2.position.set(0.35,2.4,1.2);
group.add(eye2);

const mouth = new THREE.Mesh(
new THREE.TorusGeometry(0.35,0.07,16,32,Math.PI),
faceMat
);

mouth.rotation.x = Math.PI * 0.95;
mouth.position.set(0,2.15,1.35);

group.add(mouth);

scene.add(group);

return group;

}


// ==========================
// CREATE PLAYERS
// ==========================

const player = createPlayer(0x3366ff);
player.position.set(0,0,0);
player.visible = false;
player.health = 100
player.maxHealth = 100

const enemy = createPlayer(0xff3333);
enemy.position.set(10,0,0);
enemy.health = 100;
enemy.maxHealth = 100;


// ==========================
// POINTER LOCK CONTROLS
// ==========================

const controls = new PointerLockControls(camera,document.body);
scene.add(controls.object);

controls.object.position.set(0,2,0);

document.addEventListener("click",()=>{
controls.lock();
});


// ==========================
// KEYBOARD INPUT
// ==========================

const keys = {};

document.addEventListener("keydown",(e)=>{
keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup",(e)=>{
keys[e.key.toLowerCase()] = false;
});

// ==========================
// DAMAGE/HEALTH FUNCTION
// ==========================
function damagePlayer(target, amount) {
    target.health -= amount
    console.log(target.health)
    if(target.health < 0) {
        target.health = 0
    }
    if(target === player) {
        updateHealthUI(target)
    }
    if(target.health === 0){
        console.log(target, ' Dead')
    }
}

function updateHealthUI(target) {
    const percent = (target.health / target.maxHealth) * 100;
    document.getElementById("healthFill").style.width = percent + '%';
}

document.addEventListener("keydown", (e) => {
    if(e.key === 'h') {
        damagePlayer(player, 10)
    }
    if(e.key === 'k') {
        damagePlayer(enemy, 25)
    }
})

// ==========================
// MOVEMENT VARIABLES
// ==========================

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let gravity = 30;
let jumpForce = 10;
let isGrounded = true;


// ==========================
// GAME LOOP
// ==========================

function animate(){

requestAnimationFrame(animate);

const delta = clock.getDelta();

if(controls.isLocked){

direction.set(0,0,0);

if(keys["w"]) direction.z += 1;
if(keys["s"]) direction.z -= 1;
if(keys["a"]) direction.x -= 1;
if(keys["d"]) direction.x += 1;

direction.normalize();

let speed = keys["shift"] ? 10 : 5;

controls.moveRight(direction.x * speed * delta);
controls.moveForward(direction.z * speed * delta);


// jumping

if(keys[" "] && isGrounded){
velocity.y = jumpForce;
isGrounded = false;
}

velocity.y -= gravity * delta;

controls.object.position.y += velocity.y * delta;

if(controls.object.position.y < 2){
velocity.y = 0;
controls.object.position.y = 2;
isGrounded = true;
}

}


// ==========================
// PLAYER MODEL FOLLOW CAMERA
// ==========================

player.position.copy(controls.object.position);


// ==========================
// RENDER
// ==========================

renderer.render(scene,camera);

}

animate();


// ==========================
// WINDOW RESIZE
// ==========================

window.addEventListener("resize",()=>{

camera.aspect = window.innerWidth/window.innerHeight;
camera.updateProjectionMatrix();

renderer.setSize(
window.innerWidth,
window.innerHeight
);

});