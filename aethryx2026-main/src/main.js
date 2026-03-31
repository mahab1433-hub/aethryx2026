import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ---- SCENE SETUP ----
const canvas = document.getElementById('background-canvas');

const isMobile = window.innerWidth <= 768;
const pixelRatio = isMobile ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 1.2); // Capped at 1.2 for performance

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(pixelRatio);
renderer.setClearColor(0x000000, 1); // Set absolute black background

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.005);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10); // Start very close to the chip for splash animation
camera.lookAt(0, 0, 0);

// ---- POST PROCESSING ----
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.1;
bloomPass.strength = 2.0;
bloomPass.radius = 0.6;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// ---- COLORS ----
const colors = {
    baseMetal: 0x010208,
    glassDie: 0x000000,
    glowCyan: 0x00d9ff,
    circuitLine: 0x005577, // Slightly brighter for visibility
    node: 0x00d9ff,
    electron: 0x00d9ff,
    accent: 0x00aaff,
    gridMain: 0x003344,
    gridSub: 0x000815
};

const board = new THREE.Group();
scene.add(board);

// ---- BACKGROUND GRID ----
const gridHelper = new THREE.GridHelper(400, 100, colors.gridMain, colors.gridSub);
gridHelper.rotation.x = Math.PI / 2;
gridHelper.position.z = -2;
gridHelper.material.transparent = true;
gridHelper.material.opacity = 0.15;
board.add(gridHelper);

// ---- 1. RANDOMIZED MATRIX CHIP ----
const chipGroup = new THREE.Group();
chipGroup.position.set(0, 0, 0);
board.add(chipGroup);

function createCyberChipTexture(isBump = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Background - a deep neon purple/blue
    ctx.fillStyle = isBump ? '#000000' : '#08011a';
    ctx.fillRect(0, 0, 1024, 1024);

    // Ultra-Realistic Etched Silicon Substrate
    ctx.lineWidth = 1;
    // Draw segmented data banks instead of infinite glowing grids
    for (let y = 140; y < 880; y += 32) {
        for (let x = 140; x < 880; x += 128) {
            // Only draw if we are outside the core logic area
            if (x > 360 && x < 660 && y > 360 && y < 660) continue;

            ctx.strokeStyle = isBump ? '#555555' : 'rgba(0, 243, 255, 0.05)'; // Heavy physical bumps, faint neon
            ctx.strokeRect(x, y, 116, 24);

            // Tiny internal logic gates spaced densely inside each cluster
            ctx.beginPath();
            for (let lx = x + 4; lx < x + 116; lx += 8) {
                ctx.moveTo(lx, y);
                ctx.lineTo(lx, y + 24);
            }
            ctx.stroke();
        }
    }

    // Reduced base chip intensity to let the bright grid be the visual focus
    const traceCyan = isBump ? '#ffffff' : '#0088aa';
    ctx.strokeStyle = traceCyan;
    ctx.fillStyle = traceCyan;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    const margin = 120;

    // Outer Chip Border
    ctx.lineWidth = 16;
    if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(margin, margin, 1024 - margin * 2, 1024 - margin * 2, 24); ctx.stroke();
    } else {
        ctx.strokeRect(margin, margin, 1024 - margin * 2, 1024 - margin * 2);
    }

    // Inner Core Border
    const coreMargin = 384;
    ctx.lineWidth = 12;
    if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(coreMargin, coreMargin, 1024 - coreMargin * 2, 1024 - coreMargin * 2, 16); ctx.stroke();
    } else {
        ctx.strokeRect(coreMargin, coreMargin, 1024 - coreMargin * 2, 1024 - coreMargin * 2);
    }

    // Core Fill (Solid faintly glowing center)
    ctx.fillStyle = isBump ? '#111111' : 'rgba(0, 255, 255, 0.05)';
    if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(coreMargin + 24, coreMargin + 24, 1024 - coreMargin * 2 - 48, 1024 - coreMargin * 2 - 48, 8); ctx.fill();
    }

    ctx.fillStyle = traceCyan;
    const drawPad = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); };
    for (let i = 240; i <= 784; i += 64) {
        drawPad(margin, i);
        drawPad(1024 - margin, i);
        drawPad(i, margin);
        drawPad(i, 1024 - margin);
    }

    ctx.lineWidth = 12;
    ctx.shadowBlur = 5;

    const drawRoute = (sx, sy, bendX, bendY, ex, ey) => {
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(bendX, bendY);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Solid end pad
        ctx.beginPath(); ctx.arc(ex, ey, 18, 0, Math.PI * 2); ctx.fill();
        // Inner hole in end pad
        ctx.save();
        ctx.fillStyle = isBump ? '#000000' : '#08011a';
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    };

    // Procedurally map beautiful symmetrical dense traces covering all bounds!
    const drawDenseRoute = (side, padPos) => {
        let sx, sy, bendX, bendY, ex, ey;
        // isDirect means it's perfectly aligned to hit the squarish core directly
        let isDirect = padPos > 320 && padPos < 704;

        let pOffset = (padPos < 512) ? 40 : -40; // 45 angle shift towards center

        if (side === 'top') {
            sx = padPos; sy = margin + 12;
            ex = isDirect ? sx : sx + pOffset;
            bendX = ex;
            bendY = sy + (isDirect ? 60 : 80 + (padPos % 128) / 2);
            ey = coreMargin - 24;
        }
        else if (side === 'bottom') {
            sx = padPos; sy = 1024 - margin - 12;
            ex = isDirect ? sx : sx + pOffset;
            bendX = ex;
            bendY = sy - (isDirect ? 60 : 80 + (padPos % 128) / 2);
            ey = 1024 - coreMargin + 24;
        }
        else if (side === 'left') {
            sy = padPos; sx = margin + 12;
            ey = isDirect ? sy : sy + pOffset;
            bendY = ey;
            bendX = sx + (isDirect ? 60 : 80 + (padPos % 128) / 2);
            ex = coreMargin - 24;
        }
        else if (side === 'right') {
            sy = padPos; sx = 1024 - margin - 12;
            ey = isDirect ? sy : sy + pOffset;
            bendY = ey;
            bendX = sx - (isDirect ? 60 : 80 + (padPos % 128) / 2);
            ex = 1024 - coreMargin + 24;
        }
        drawRoute(sx, sy, bendX, bendY, ex, ey);
    };

    // Execute for every pad location we created earlier!
    for (let i = 240; i <= 784; i += 64) {
        if (i !== 512) { // Skip the exact geometric center point
            drawDenseRoute('top', i);
            drawDenseRoute('bottom', i);
            drawDenseRoute('left', i);
            drawDenseRoute('right', i);
        }
    }

    // Four corner mounting holes
    const drawHole = (hx, hy) => {
        ctx.beginPath(); ctx.arc(hx, hy, 18, 0, Math.PI * 2); ctx.stroke();
    }
    drawHole(margin + 48, margin + 48);
    drawHole(1024 - margin - 48, margin + 48);
    drawHole(margin + 48, 1024 - margin - 48);
    drawHole(1024 - margin - 48, 1024 - margin - 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

function createAuraTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

// 1A. Intense Glow Aura
const auraGeo = new THREE.PlaneGeometry(35, 35);
const auraMat = new THREE.MeshBasicMaterial({
    map: createAuraTexture(),
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const auraMesh = new THREE.Mesh(auraGeo, auraMat);
auraMesh.position.z = -1;
chipGroup.add(auraMesh);

// 1B. Base Platform (pure dark)
const baseGeo = new THREE.BoxGeometry(16, 16, 1.5);
const baseMat = new THREE.MeshPhysicalMaterial({
    color: 0x020a16,
    metalness: 0.9,
    roughness: 0.3,
});
const baseMesh = new THREE.Mesh(baseGeo, baseMat);
chipGroup.add(baseMesh);

// 1C. Glowing TRON Die Surface
const logoGeo = new THREE.PlaneGeometry(16, 16);
const chipMap = createCyberChipTexture(false);
const chipBump = createCyberChipTexture(true);

const logoMat = new THREE.MeshPhysicalMaterial({
    map: chipMap,
    bumpMap: chipBump,
    bumpScale: 0.1,
    metalness: 0.9,
    roughness: 0.6,
    color: 0x444444,
    emissiveMap: chipBump,
    emissive: 0x00bbee,
    emissiveIntensity: 1.0 // Reduced back down significantly
});
const logoMesh = new THREE.Mesh(logoGeo, logoMat);
logoMesh.position.z = 0.76;
chipGroup.add(logoMesh);

// 1D. Awwwards Style Refractive Glass Dome
const glassGeo = new THREE.BoxGeometry(15.6, 15.6, 0.4);
const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 1.0, // High-end glass refraction
    ior: 1.5,
    thickness: 0.5,
    transparent: true
});
const glassMesh = new THREE.Mesh(glassGeo, glassMat);
glassMesh.position.z = 0.96; // Encapsulates the inner die
chipGroup.add(glassMesh);

// Bring back lights for PBR
const directionalLight = new THREE.DirectionalLight(0x00f3ff, 1.2); // Reduced from 4.5
directionalLight.position.set(5, 12, 10);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Reduced from 2.0
scene.add(ambientLight);
chipGroup.add(logoMesh);


// ---- 2. DENSE PCB PATHWAYS ----
function generateBasePaths() {
    const qPaths = [];
    const numPins = 5;

    // Top Edge paths 
    for (let i = 0; i < numPins; i++) {
        let px = 1 + (i / numPins) * 6; // x goes 1 -> 7
        let py = 8.0; // Outer edge of 16x16 chip
        const pts = [new THREE.Vector3(px, py, 0)];

        let len1 = 2 + (i % 2) * 2;
        py += len1;
        pts.push(new THREE.Vector3(px, py, 0));

        // 45 degree jog
        let len2 = 4 + i;
        px += len2; py += len2;
        pts.push(new THREE.Vector3(px, py, 0));

        // Straight line to edge
        py += 60;
        pts.push(new THREE.Vector3(px, py, 0));
        qPaths.push(pts);
    }

    // Right Edge paths
    for (let i = 0; i < numPins; i++) {
        let px = 8.0;
        let py = 1 + (i / numPins) * 6;
        const pts = [new THREE.Vector3(px, py, 0)];

        let len1 = 2 + (i % 2) * 2;
        px += len1;
        pts.push(new THREE.Vector3(px, py, 0));

        // 45 deg jog
        let len2 = 4 + i;
        px += len2; py += len2;
        pts.push(new THREE.Vector3(px, py, 0));

        // Straight line
        px += 60;
        pts.push(new THREE.Vector3(px, py, 0));
        qPaths.push(pts);
    }
    return qPaths;
}

const basePaths = generateBasePaths();
const paths = [];
const electrons = [];

const mirrors = [
    [1, 1],   // Q1
    [-1, 1],  // Q2
    [-1, -1], // Q3
    [1, -1]   // Q4
];

mirrors.forEach(([mx, my]) => {
    basePaths.forEach(pts => {
        const mirroredPts = pts.map(p => new THREE.Vector3(p.x * mx, p.y * my, 0));
        const curve = new THREE.CatmullRomCurve3(mirroredPts, false, 'catmullrom', 0);
        paths.push(curve);

        const geo = new THREE.BufferGeometry().setFromPoints(mirroredPts);
        const mat = new THREE.LineBasicMaterial({ color: colors.circuitLine, transparent: true, opacity: 0.5 }); // Halved visibility to prevent glare
        const line = new THREE.Line(geo, mat);
        board.add(line);

        // Nodes
        for (let j = 1; j < mirroredPts.length - 1; j++) {
            if (Math.random() > 0.4) {
                const nodeGeo = new THREE.CircleGeometry(0.3, 16);
                const nodeMat = new THREE.MeshBasicMaterial({ color: colors.node, transparent: true, opacity: 0.8 });
                const node = new THREE.Mesh(nodeGeo, nodeMat);
                node.position.copy(mirroredPts[j]);
                board.add(node);
            }
        }

        // Dynamic electrons
        if (Math.random() > 0.2) {
            const numElectrons = isMobile ? 1 : (Math.random() > 0.8 ? 2 : 1);
            for (let e = 0; e < numElectrons; e++) {
                const eGeo = new THREE.CircleGeometry(0.5, 16);
                const eMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.7 ? colors.accent : colors.electron });
                const mesh = new THREE.Mesh(eGeo, eMat);
                mesh.position.z = 0.1;
                board.add(mesh);
                electrons.push({
                    mesh,
                    path: curve,
                    progress: Math.random(),
                    baseSpeed: Math.random() * 0.0015 + 0.001 // Slower electron flow
                });
            }
        }
    });
});

// ---- 3. PARTICLES ----
const particleCount = isMobile ? 100 : 300;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 200;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 200;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 10;
}
particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
    color: colors.electron,
    size: 0.3,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(particleGeometry, particleMaterial);
particleMaterial.size = 0.2;
particleMaterial.opacity = 0.15;
scene.add(particles);

// ---- 4. LIGHTS ----
scene.add(new THREE.AmbientLight(0xffffff, 0.2));

const chipLight = new THREE.PointLight(colors.glowCyan, 1.0, 100);
chipLight.position.set(0, 0, 10);
scene.add(chipLight);

// ---- PARALLAX CONTROLS ----
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
    const isNowMobile = window.innerWidth <= 768;
    const newPixelRatio = isNowMobile ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 1.5);
    renderer.setPixelRatio(newPixelRatio);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// ---- ANIMATION LOOP ----
let lastTime = performance.now();
let elapsedTime = 0;

// Status Box Logic
const elStatsLatency = document.getElementById('stats-latency');
const elStatsFps = document.getElementById('stats-fps');
let lastFpsUpdate = 0;
let frames = 0;
let simulatedLatency = 32;

function animate() {
    requestAnimationFrame(animate);
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    elapsedTime += deltaTime;
    const time = elapsedTime;

    // Update Status Box (once per second for FPS, random for Latency)
    frames++;
    if (time - lastFpsUpdate > 1.0) {
        const fps = Math.round(frames / (time - lastFpsUpdate));
        if (elStatsFps) elStatsFps.textContent = `${fps} fps`;

        // Randomize latency slightly for realism
        simulatedLatency = Math.floor(20 + Math.random() * 25);
        if (elStatsLatency) elStatsLatency.textContent = `${simulatedLatency} ms`;

        frames = 0;
        lastFpsUpdate = time;
    }

    // Subtle parallax (GSAP controls base rotation during intro, mouse adds delta)
    board.rotation.x += ((mouseY * 0.05) - board.rotation.x) * 0.05;
    board.rotation.y += ((mouseX * 0.05) - board.rotation.y) * 0.05;

    // Static background rotation
    particles.rotation.z = time * 0.01;

    // Electron Animation 
    electrons.forEach((electron) => {
        const speedMultiplier = 0.5 + Math.sin(electron.progress * Math.PI) * 0.8;
        electron.progress += electron.baseSpeed * speedMultiplier;

        if (electron.progress > 1) {
            electron.progress = 0;
        }

        const point = electron.path.getPointAt(electron.progress);
        if (point) {
            electron.mesh.position.copy(point);

            let scaleMod = 1.0;
            if (electron.progress < 0.05) {
                scaleMod = electron.progress / 0.05;
            } else if (electron.progress > 0.95) {
                scaleMod = (1.0 - electron.progress) / 0.05;
            }
            electron.mesh.scale.setScalar(scaleMod);
        }
    });

    // Subtle aura pulse
    auraMesh.scale.setScalar(1.0);
    auraMesh.material.opacity = 0.1;

    composer.render();
}

animate();

// ---- 5. MOBILE MENU TOGGLE ----
const menuToggle = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });
}

// ---- GSAP ANTI-GRAVITY, LENIS & PARALLAX ----
gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis for buttery smooth scrolling
const lenis = new Lenis({
    duration: 0.6, // Even faster for responsiveness
    lerp: 0.1,    // Smoother catch-up
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo.out
    smooth: true,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// Smooth Parallax for glow orbs
gsap.utils.toArray('.glow-orb').forEach((orb) => {
    const speed = parseFloat(orb.getAttribute('data-speed'));
    gsap.to(orb, {
        y: () => window.innerHeight * speed * 2,
        ease: "none",
        scrollTrigger: {
            trigger: document.body,
            start: "top top",
            end: "bottom top",
            scrub: true
        }
    });
});

// Awwwards Style Soft Reveal for Sections
const sections = document.querySelectorAll('section');
sections.forEach(section => {
    // Select elements to stagger
    const headings = section.querySelectorAll('h1, h2, h3, p:not(.event-card p)');
    const cards = section.querySelectorAll('.glass-panel');

    // Initial states
    if (headings.length > 0) gsap.set(headings, { opacity: 0, y: 40 });
    if (cards.length > 0) gsap.set(cards, { opacity: 0, y: 80, scale: 0.95 });

    // Create timeline
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: section,
            start: "top 75%", // Triggers nicely when entering
            toggleActions: "play none none reverse"
        }
    });

    if (headings.length > 0) {
        tl.to(headings, {
            opacity: 1,
            y: 0,
            duration: 1.0, // Reduced from 1.6
            stagger: 0.05, // Reduced from 0.1
            ease: "expo.out"
        });
    }

    if (cards.length > 0) {
        tl.to(cards, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.2, // Reduced from 2.0
            stagger: 0.08, // Reduced from 0.15
            ease: "expo.out",
            clearProps: "transform" // restore CSS continuous floating animations
        }, "-=0.8"); // Reduced from -=1.2
    }
});

// ================================================================
//  EVENTS MODAL — DATA & INTERACTION
// ================================================================

const EVENT_DATA = {
    paper: {
        icon: '<i class="fas fa-file-code"></i>',
        category: 'Technical Protocol',
        title: '(PAPER X) Paper Presentation',
        accent: false,
        description: 'Showcase your innovative ideas, research insights, and technical expertise at our Paper Presentation event. This platform provides an opportunity for students to present their work, exchange knowledge, and gain valuable feedback from experts.',
        teamSize: 'Max 3 Participants',
        duration: '7 Minutes',
        eligibility: 'Presentation Timings via WhatsApp',
        rounds: [
            { label: 'Domains', desc: 'VLSI, IoT & Embedded Systems, Information Technology (IT), Cybersecurity, Artificial Intelligence (AI).' },
            { label: 'Presentation Format', desc: '7 Minutes total: 5 Minutes for Presentation and 2 Minutes for Q&A.' },
        ],
        rules: [
            'Participants must upload their presentation in advance via Google Form.',
            'Accepted formats: PDF / PPTX only.',
            'Evaluation based on Technical Knowledge, Innovation, Clarity, Time Management, and Q&A ability.',
            'Content must be clear, concise, and within the time limit.',
            'Presentation timings will be shared via WhatsApp.',
        ],
        coordinators: [],
    },

    poster: {
        icon: '<i class="fas fa-chalkboard"></i>',
        category: 'Technical Protocol',
        title: '(Vision Grid) Poster presentation',
        accent: false,
        description: 'Present your ideas visually and creatively through our Poster Presentation event. This event encourages participants to communicate technical concepts in a concise and visually engaging format while interacting with judges and peers.',
        teamSize: 'Max 2 Participants',
        duration: '5–7 Minutes',
        eligibility: 'Printed Poster Required',
        rounds: [
            { label: 'Domains', desc: 'VLSI, IoT & Embedded Systems, Information Technology (IT), Cybersecurity, Artificial Intelligence (AI).' },
            { label: 'Exhibition & Defence', desc: 'Each team will be given 5–7 Minutes to present their poster and interact with judges.' },
        ],
        rules: [
            'Posters should be clear, informative, and visually appealing.',
            'Participants must bring their own printed poster for the event.',
            'Content must highlight: Problem Statement, Methodology, Results/Outcome, and Conclusion.',
            'Evaluated on innovation, clarity of presentation, and ability to answer questions.',
        ],
        coordinators: [],
    },

    coding: {
        icon: '<i class="fas fa-laptop-code"></i>',
        category: 'Technical Protocol',
        title: 'Logic League',
        accent: false,
        description: 'Logic League is a technical coding challenge designed to test participants’ programming knowledge, logical thinking, debugging skills, and problem-solving ability through multiple competitive rounds.',
        teamSize: '2 Members per Team',
        duration: 'Varies by round',
        eligibility: 'Shortlisted Participants',
        rounds: [
            { label: 'Round 1', desc: 'Output Prediction — Participants must correctly predict the output of a given code snippet without executing it, within a strict time limit.' },
            { label: 'Round 2', desc: 'One Problem – Many Ways — Teams solve a programming challenge; evaluated on code correctness, length (shortest code wins), and logical efficiency.' },
            { label: 'Round 3', desc: 'Error Debugging — Identify and fix errors in a provided code snippet within the allocated time limit.' },
        ],
        rules: [
            'Each team must consist of exactly 2 members.',
            'Topics include Python, Output Prediction, and Debugging.',
            'Teams are evaluated based on Accuracy, Code Efficiency, and Time Management.',
            'Decisions made by the event coordinators are final.',
        ],
        coordinators: [],
    },

    quiz: {
        icon: '<i class="fas fa-microchip"></i>',
        category: 'Technical Protocol',
        title: '(TECH Q) TECHNICAL QUIZ',
        accent: false,
        description: 'Test your expertise in Basic Electronics, VLSI, IoT, Embedded Systems, and Basic Coding. Teams will be shortlisted based on Google Form responses submitted by participants.',
        teamSize: '2 Members per Team',
        duration: '1.5 Hours',
        eligibility: 'Shortlisted from Google Form',
        rounds: [
            { label: 'Round 1', desc: 'First Spark — Quick-response verbal round where participants raise their hands to answer. Tests fundamental knowledge and alertness.' },
            { label: 'Round 2', desc: 'Screen Surge — Questions displayed on screen; participants answer by raising hands. Focuses on conceptual understanding and analytical thinking.' },
            { label: 'Round 3', desc: 'Rapid Circuit — High-speed rapid fire round where teams answer a series of questions within a limited time to evaluate speed and accuracy.' },
        ],
        rules: [
            'Each team must consist of exactly 2 members.',
            'Initial shortlisting is based on Google Form responses.',
            'In hand-raising rounds, the first to raise their hand will be given priority.',
            'Verbal answers must be clear and direct.',
            'The Rapid Circuit round requires quick response times—accuracy and speed are key.',
            'Decisions made by the event coordinators/judges are final.',
            'Electronic gadgets are not allowed unless specified during round 2.',
        ],
        coordinators: [],
    },


    doodle: {
        icon: '<i class="fas fa-pen-fancy"></i>',
        category: 'Offline Module',
        title: 'Doodle & Guess',
        accent: true,
        description: 'Doodle & Guess is a fun and interactive team-based game where one participant draws a given word, while the other teammate guesses it within a limited time. This event enhances creativity, quick thinking, and teamwork in an entertaining way.',
        teamSize: '2 Members',
        duration: '3 Minutes per team',
        eligibility: 'Open to All Students',
        rounds: [
            { label: 'Round 1', desc: 'Theme: Sports' },
            { label: 'Round 2', desc: 'Theme: Compound Words' },
            { label: 'Round 3', desc: 'Theme: Logo' },
        ],
        rules: [
            'The game will be conducted in 3 rounds.',
            'Each team will have 2 members.',
            'Each team will be given 3 minutes to guess as many words as possible.',
            'One member will draw, and the other member will guess.',
            'The member chosen for drawing cannot be replaced during the game.',
            'Words will be given in the form of slots; the participant must draw the selected word.',
            'If the team gives two consecutive wrong guesses, no points will be awarded for that slot.',
            'Speaking, writing letters/numbers, or using actions is not allowed—only drawing is permitted.',
            'Each correct guess will be awarded points.',
            'The team with the maximum correct guesses within 3 minutes will be the winner.',
        ],
        coordinators: [
            { name: 'Lohendran C', phone: '+91 -' },
            { name: 'Lokesh R', phone: '+91 -' },
            { name: 'Deepika S E', phone: '+91 -' },
        ],
    },

    ipl: {
        icon: '<i class="fas fa-gavel"></i>',
        category: 'Offline Module',
        title: 'Bid Wars (IPL Auction)',
        accent: true,
        description: 'Ipl auction is a non-technical fun event. This event focuses on bidding for players in an auction and assembling a strong team.',
        teamSize: '3 Persons per Team',
        duration: '2 Hours',
        eligibility: 'Shortlisted from Round 1 (24 members)',
        rounds: [
            { label: 'Round 1', desc: 'Cricket & IPL Quiz — Participants take a quiz related to cricket and IPL auction history. The top 24 scoring members will be shortlisted.' },
            { label: 'Round 2', desc: 'IPL Auction — The 24 shortlisted members (forming 8 teams of 3) will participate in a full-scale IPL auction simulation and build their ultimate squad.' },
        ],
        rules: [
            'Each team must consist of exactly 3 members.',
            'Initial round is a qualifying cricket quiz to select the top 24 participants.',
            'The final auction is restricted to the top 8 teams formed from the shortlisted members.',
            'Auction rules and virtual budgets will be explained at the start of Round 2.',
            'Date: 09.04.2026 | Venue: VLSI Classroom.',
        ],
        coordinators: [],
    },

    funq: {
        icon: '<i class="fas fa-brain"></i>',
        category: 'Offline Module',
        title: 'Fun Quiz',
        accent: true,
        description: 'A fun and engaging quiz event designed to test participants’ knowledge in general topics like movies, sports, current affairs, and entertainment through exciting rounds.',
        teamSize: 'Individual (1 Member)',
        duration: 'Varies by round',
        eligibility: 'Open to All Students',
        rounds: [
            { label: 'Round 1', desc: 'Rapid Fire — Participants answer a series of quick questions within a limited time to test speed and accuracy.' },
            { label: 'Round 2', desc: 'Visual Round — Identification round where participants name logos, personalities, movie scenes, and more from visual cues.' },
            { label: 'Round 3', desc: 'Buzzer Round — High-stakes round where faster responses yield more points. Speed and precision are critical.' },
        ],
        rules: [
            'Each participant competes individually.',
            'Topics cover General Knowledge, Movies, Sports, and Current Affairs.',
            'No physical or digital aids are allowed during the rounds.',
            'Buzzer priority is given to the fastest participant.',
            'Decisions made by the quiz master are final and binding.',
        ],
        coordinators: [],
    },

    movie: {
        icon: '<i class="fas fa-film"></i>',
        category: 'Offline Module',
        title: 'Film Fiesta',
        accent: true,
        description: 'A cinematic challenge designed to test your movie knowledge through visual hints, background themes, and iconic dialogues across three competitive rounds.',
        teamSize: '1–3 Members per Team',
        duration: 'Varies by Round',
        eligibility: 'Max 10 Teams (Leaderboard Eliminations)',
        rounds: [
            { label: 'Round 1 — Picture Puzzle', desc: 'Identify movie names through a series of picture puzzles. Each correct guess earns the team 10 points.' },
            { label: 'Round 2 — Theme Music', desc: 'An audio-based round where teams must name movies based on their background theme music.' },
            { label: 'Round 3 — Iconic Dialogues', desc: 'A final audio-based quiz focusing on specific dialogues. Cumulative points will finalize the ultimate leaderboard.' },
        ],
        rules: [
            'Teams can consist of 1 to 3 members.',
            'Total occupancy is strictly limited to 10 teams.',
            '10 points are awarded for every correct guess per round.',
            'Leaderboard updates after every round; lowest-scoring teams are eliminated as per regulations.',
            'Final leaderboard scores at the end of Round 3 determine the top 3 prize winners.',
        ],
        coordinators: [],
    },
};

// ---- MODAL DOM REFERENCES ----
const modal = document.getElementById('event-modal');
const modalClose = document.getElementById('modal-close');
const modalBackdrop = modal.querySelector('.modal-backdrop');

const elIcon = document.getElementById('modal-icon');
const elCategory = document.getElementById('modal-category');
const elTitle = document.getElementById('modal-title');
const elDescription = document.getElementById('modal-description');
const elTeam = document.getElementById('meta-team');
const elDuration = document.getElementById('meta-duration');
const elEligibility = document.getElementById('meta-eligibility');
const elRounds = document.getElementById('modal-rounds');
const elRulesEl = document.getElementById('modal-rules');
const roundsSection = document.getElementById('rounds-section');
const registerBtn = document.getElementById('modal-register');

let lastFocusedElement = null;

function openModal(eventKey) {
    const data = EVENT_DATA[eventKey];
    if (!data) return;

    lastFocusedElement = document.activeElement;

    // Populate
    elIcon.innerHTML = data.icon;
    elCategory.textContent = data.category;
    elTitle.textContent = data.title;
    elDescription.textContent = data.description;
    elTeam.textContent = data.teamSize;
    elDuration.textContent = data.duration;
    elEligibility.textContent = data.eligibility;

    // Rounds
    if (data.rounds && data.rounds.length) {
        roundsSection.style.display = 'flex';
        elRounds.innerHTML = data.rounds.map(r =>
            `<div class="round-item">
                <span class="round-number">${r.label}</span>
                <p class="round-desc">${r.desc}</p>
            </div>`
        ).join('');
    } else {
        roundsSection.style.display = 'none';
    }

    // Rules
    elRulesEl.innerHTML = data.rules.map(rule => `<li>${rule}</li>`).join('');


    // Accent variant
    if (data.accent) {
        modal.classList.add('modal--accent');
    } else {
        modal.classList.remove('modal--accent');
    }

    // Register button closes modal then scrolls
    registerBtn.onclick = () => closeModal();

    // Scroll to top of modal body
    modal.querySelector('.modal-container').scrollTop = 0;

    // Show
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
}

function closeModal() {
    if (document.activeElement && document.activeElement.id === 'modal-close') {
        document.activeElement.blur();
    }
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
}

// Card click handlers
document.querySelectorAll('.event-card[data-event]').forEach(card => {
    card.addEventListener('click', () => openModal(card.dataset.event));
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(card.dataset.event);
        }
    });
});

// Close handlers
modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
});

// ---- 6. SPLASH SCREEN LOGIC (GSAP CINEMATIC INTRO) ----
window.addEventListener('load', () => {
    const splashScreen = document.getElementById('splash-screen');
    const title = document.querySelector('.splash-logo-container');
    const subtitle = document.querySelector('.splash-subtitle');
    const line = document.querySelector('.splash-line');

    // Create master intro timeline
    const introTl = gsap.timeline({
        onComplete: () => {
            splashScreen.classList.add('hidden');
            document.body.classList.remove('no-scroll');
            document.body.classList.remove('hide-content');

            // Hero Logo Custom "Spin-in" Entrance
            gsap.to(".hero-logo-container img", {
                opacity: 1,
                scale: 1,
                rotation: 0,
                filter: "blur(0px)",
                duration: 2.2,
                ease: "expo.out",
                delay: 0.2
            });
        }
    });

    // 0. Initial state for hero logo reveal (spin & fade)
    gsap.set(".hero-logo-container img", { opacity: 0, scale: 0.8, rotation: -180, filter: "blur(15px)" });

    // 1. Camera Pullback & Board Spin
    introTl.to(camera.position, {
        z: 85,
        duration: 3.0,
        ease: "power3.inOut"
    }, 0);

    introTl.to(board.rotation, {
        z: Math.PI * 2,
        duration: 3.0,
        ease: "power3.inOut"
    }, 0);

    // 2. Bloom Power Surge Flash right at apex of pullback
    introTl.to(bloomPass, {
        strength: 6.0,
        radius: 1.5,
        duration: 0.4,
        ease: "power2.in"
    }, 1.4);

    introTl.to(bloomPass, {
        strength: 2.0,
        radius: 0.6,
        duration: 1.5,
        ease: "power3.out"
    }, 1.8);

    // 3. Cinematic Typography Reveal
    if (title) {
        gsap.set(title, { opacity: 0, scale: 1.1, filter: "blur(15px)" });
        introTl.to(title, {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 1.5,
            ease: "expo.out"
        }, 1.6);
    }

    if (subtitle) {
        gsap.set(subtitle, { opacity: 0, scale: 1.1, filter: "blur(10px)", letterSpacing: "15px" });
        introTl.to(subtitle, {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            letterSpacing: "5px",
            duration: 1.5,
            ease: "expo.out"
        }, 1.7);
    }

    if (line) {
        gsap.set(line, { width: "0%" });
        introTl.to(line, {
            width: "100%",
            duration: 1.5,
            ease: "expo.out"
        }, 1.6);
    }

    // Hold briefly before unlocking screen
    introTl.to({}, { duration: 0.3 });
});

// ---- HERO COUNTDOWN LOGIC ----
const countdownDate = new Date("April 9, 2026 08:30:00").getTime();

const x = setInterval(function () {
    const now = new Date().getTime();
    const distance = countdownDate - now;

    const elDays = document.getElementById("cd-days");
    const elHours = document.getElementById("cd-hours");
    const elMinutes = document.getElementById("cd-minutes");
    const elSeconds = document.getElementById("cd-seconds");

    if (distance < 0) {
        clearInterval(x);
        const countdownContainer = document.getElementById("hero-countdown");
        if (countdownContainer) {
            countdownContainer.innerHTML = "<div class='neon-text' style='font-size: 1.5rem; font-family: Orbitron; padding: 20px;'>INITIALIZATION COMPLETE</div>";
        }
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (elDays) elDays.innerText = days < 10 ? "0" + days : days;
    if (elHours) elHours.innerText = hours < 10 ? "0" + hours : hours;
    if (elMinutes) elMinutes.innerText = minutes < 10 ? "0" + minutes : minutes;
    if (elSeconds) elSeconds.innerText = seconds < 10 ? "0" + seconds : seconds;
}, 1000);
