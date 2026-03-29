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
                    baseSpeed: Math.random() * 0.006 + 0.003 // Reduced for medium speed electric feel
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
const clock = new THREE.Clock();

// Status Box Logic
const elStatsLatency = document.getElementById('stats-latency');
const elStatsFps = document.getElementById('stats-fps');
let lastFpsUpdate = 0;
let frames = 0;
let simulatedLatency = 32;

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

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
        description: 'Showcase your original research and innovative ideas in VLSI Design, Microelectronics, Embedded Systems, and allied domains. Participants will present their work before a panel of faculty judges and receive professional feedback.',
        teamSize: '2 – 3 Members',
        duration: '3 Hours',
        eligibility: 'UG / PG Students',
        rounds: [
            { label: 'Round 1', desc: 'Abstract Submission — Submit a 250-word abstract of your paper for screening. Shortlisted teams will be notified 2 days before the event.' },
            { label: 'Round 2', desc: 'Presentation — Shortlisted teams present their paper (PPT) within 8 minutes, followed by a 5-minute Q&A session with the judges.' },
        ],
        rules: [
            'Each team must consist of 2 to 3 members from the same institution.',
            'Papers must be original work; plagiarism will lead to immediate disqualification.',
            'Abstract must be submitted at least 48 hours before the event.',
            'Presentation duration: 8 minutes + 5 minutes Q&A.',
            'Teams must bring their presentation on a USB drive or submit it beforehand.',
            'Use of AI-generated content must be disclosed and is subject to judge discretion.',
            'Judges\' decision is final and binding.',
        ],
        coordinators: [
            { name: 'Vishal R', phone: '+91 98765 43210' },
            { name: 'Priya S', phone: '+91 87654 32109' },
        ],
    },

    quiz: {
        icon: '<i class="fas fa-microchip"></i>',
        category: 'Technical Protocol',
        title: '(TECH Q) TECHNICAL QUIZ',
        accent: false,
        description: 'Test the depth of your technical knowledge spanning digital electronics, circuit design, semiconductor physics, VLSI fundamentals, and current industry trends. A fast-paced, high-intensity quiz for the sharpest minds.',
        teamSize: '2 Members',
        duration: '1.5 Hours',
        eligibility: 'UG / PG Students',
        rounds: [
            { label: 'Round 1 — Rapid Fire', desc: 'MCQ-based written round. Top teams advance to Round 2.' },
            { label: 'Round 2 — Buzzer Round', desc: 'Teams compete live on buzzer questions across electronics, VLSI, and general tech. Negative marking applies.' },
            { label: 'Round 3 — Final Showdown', desc: 'Top 3 teams face a visual circuit-identification rapid round for the championship.' },
        ],
        rules: [
            'Team size: exactly 2 members.',
            'Mobile phones and electronic devices are strictly prohibited during the quiz.',
            'Negative marking of 0.5 marks per wrong answer applies in rounds 2 and 3.',
            'Buzzer timings are controlled by the quiz master — no delays allowed.',
            'Answers must be given within 10 seconds of the question being read.',
            'Decision of the quiz master is final.',
        ],
        coordinators: [
            { name: 'Arun K', phone: '+91 76543 21098' },
            { name: 'Meena L', phone: '+91 65432 10987' },
        ],
    },

    poster: {
        icon: '<i class="fas fa-chalkboard"></i>',
        category: 'Technical Protocol',
        title: '(Vision Grid) Poster presentation',
        accent: false,
        description: 'Communicate complex engineering concepts through visually engaging, high-impact technical posters. Participants defend their work to a roving panel of judges in an exhibition-style format.',
        teamSize: '2 – 3 Members',
        duration: '2 Hours',
        eligibility: 'UG / PG Students',
        rounds: [
            { label: 'Submission', desc: 'Submit digital poster (A1 size, PDF/JPG) by the given deadline for initial review.' },
            { label: 'Exhibition & Defence', desc: 'Display physical posters and defend your work to judges in a 10-minute stand-up discussion per team.' },
        ],
        rules: [
            'Poster size must be A1 (594 × 841 mm); both printed and softcopy required.',
            'Posters must be designed using standard tools (Canva, PowerPoint, Illustrator, etc.).',
            'Content must relate to ECE / VLSI / Embedded / IoT domains.',
            'Teams must be present at their poster stand at all times during judging hours.',
            'No audio or video playback allowed; poster only.',
            'Originality is mandatory; plagiarism leads to disqualification.',
        ],
        coordinators: [
            { name: 'Kavya N', phone: '+91 58765 43210' },
            { name: 'Rajan T', phone: '+91 47654 32109' },
        ],
    },

    coding: {
        icon: '<i class="fas fa-laptop-code"></i>',
        category: 'Technical Protocol',
        title: 'Logic League (coding contest)',
        accent: false,
        description: 'Compile, debug, and execute your way through high-stakes algorithmic challenges. Prove your logic and coding efficiency in a fast-paced programming environment.',
        teamSize: '1 – 2 Members',
        duration: '2 Hours',
        eligibility: 'UG / PG Students',
        rounds: [
            { label: 'Round 1 — Logic Gates', desc: 'Solve rapid-fire MCQs on output prediction, syntax, and fundamental data structures.' },
            { label: 'Round 2 — The Matrix', desc: 'Write and compile robust algorithms to solve 3 complex competitive programming problems.' },
        ],
        rules: [
            'Teams can consist of 1 or 2 members.',
            'Allowed languages: C, C++, Java, and Python.',
            'Internet access is strictly capped to the competition platform.',
            'Plagiarism checking algorithms will be run; identical codes will lead to disqualification.',
        ],
        coordinators: [
            { name: 'Karthik S', phone: '+91 99887 11223' },
            { name: 'Pooja V', phone: '+91 88776 22334' },
        ],
    },

    doodle: {
        icon: '<i class="fas fa-pen-fancy"></i>',
        category: 'Offline Module',
        title: 'Picto Play (doodle & guess)',
        accent: true,
        description: 'A hilarious and creative team game where one member draws a tech or general concept on the whiteboard while teammates race to guess the word correctly. Speed, creativity, and teamwork win the day!',
        teamSize: '3 – 4 Members',
        duration: '1 Hour',
        eligibility: 'Open to All Students',
        rounds: [
            { label: 'Round 1 — Warm Up', desc: 'General topics — easy words. Teams get familiar with the format.' },
            { label: 'Round 2 — Tech Mode', desc: 'Technical VLSI/ECE-themed doodle words. Higher points, strict time limit.' },
            { label: 'Final — Speed Draw', desc: 'Top teams compete in a rapid-fire simultaneous draw — fastest correct guess wins.' },
        ],
        rules: [
            'One member draws at a time; rotation is mandatory after each word.',
            'No verbal hints, finger pointing or mouthing of words allowed.',
            'Each word must be guessed within 60 seconds.',
            'Abbreviations and acronyms are not valid guesses unless specified.',
            'Teams must not interfere with other teams during their turn.',
            'Event coordinators assign words randomly — no swaps.',
        ],
        coordinators: [
            { name: 'Divya M', phone: '+91 99887 76655' },
            { name: 'Santhosh P', phone: '+91 88776 65544' },
        ],
    },

    ipl: {
        icon: '<i class="fas fa-gavel"></i>',
        category: 'Offline Module',
        title: 'Bid wars (ipl auction)',
        accent: true,
        description: 'Experience the thrill of the IPL mega auction! Each team plays the role of an IPL franchise management team, bidding strategically within a budget to build the most balanced and powerful cricket squad.',
        teamSize: '4 – 6 Members',
        duration: '2 Hours',
        eligibility: 'Open to All Students',
        rounds: [
            { label: 'Briefing', desc: 'Teams receive their franchise name, budget (virtual INR), and rulebook. Strategy time: 10 minutes.' },
            { label: 'Auction Phase', desc: 'Auctioneer calls players one by one. Teams bid within budget. Fastest/highest bidder wins the player.' },
            { label: 'Final Tally', desc: 'Teams submit final squads. Points awarded for balance (batters/bowlers/all-rounders/keeper).' },
        ],
        rules: [
            'Each team starts with a virtual budget of ₹100 Crore.',
            'Minimum squad size: 11 players; maximum: 15.',
            'Each team must have at least 1 wicket-keeper, 3 bowlers, and 3 batters.',
            'No player may be shared between teams.',
            'Budget overspend leads to disqualification of excess players.',
            'Bid increments: minimum ₹10 Lakh per raise.',
            'Auctioneer\'s hammer decision is final — no take-backs.',
        ],
        coordinators: [
            { name: 'Arjun V', phone: '+91 77665 54433' },
            { name: 'Nithya R', phone: '+91 66554 43322' },
        ],
    },

    funq: {
        icon: '<i class="fas fa-brain"></i>',
        category: 'Offline Module',
        title: 'Fun Q (non technical Quiz)',
        accent: true,
        description: 'A lively and entertaining general knowledge quiz covering pop culture, movies, sports, science facts, lateral thinking puzzles, and more. Perfect for quick thinkers who love a good mental challenge!',
        teamSize: '2 Members',
        duration: '1 Hour',
        eligibility: 'Open to All Students',
        rounds: [
            { label: 'Round 1 — Written', desc: 'MCQ and fill-in-the-blank questions covering GK, current affairs, and pop culture.' },
            { label: 'Round 2 — Audio/Visual', desc: 'Identify songs, movie scenes, and famous personalities from audio/visual clues.' },
            { label: 'Tie-breaker', desc: 'Rapid oral questions for tied teams — first correct answer wins.' },
        ],
        rules: [
            'Teams consist of exactly 2 members.',
            'Electronic devices are not allowed during the quiz.',
            'All answers must be written clearly and legibly.',
            'No communication between teams during the quiz.',
            'Quiz master\'s ruling on ambiguous answers is final.',
            'Bonus star questions carry double points — attempted at team\'s risk.',
        ],
        coordinators: [
            { name: 'Shreya B', phone: '+91 55443 32211' },
            { name: 'Vikram S', phone: '+91 44332 21100' },
        ],
    },

    movie: {
        icon: '<i class="fas fa-film"></i>',
        category: 'Offline Module',
        title: 'Film fiesta (movie hunt)',
        accent: true,
        description: 'Decode cinematic clues, decipher audio tracks, and race against time in this immersive movie-themed scavenger hunt across the campus.',
        teamSize: '3 – 4 Members',
        duration: '1.5 Hours',
        eligibility: 'Open to All Students',
        rounds: [
            { label: 'Round 1 — Audio Dash', desc: 'Identify movies from obscure BGM and dialogue snippets to secure the first map.' },
            { label: 'Round 2 — Frame by Frame', desc: 'Follow a trail of physical movie posters across campus, solving puzzles at each checkpoint.' },
        ],
        rules: [
            'Team size: exactly 3 to 4 members.',
            'Teams must stay together; splitting up to find clues leads to time penalties.',
            'Use of smartphones for reverse image searching is prohibited during checkpoints.',
            'The first team to decode the final sequence and reach the endpoint wins.',
        ],
        coordinators: [
            { name: 'Sanjay M', phone: '+91 77665 99887' },
            { name: 'Ananya K', phone: '+91 66554 88776' },
        ],
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
const elCoords = document.getElementById('modal-coordinators');
const roundsSection = document.getElementById('rounds-section');
const registerBtn = document.getElementById('modal-register');

function openModal(eventKey) {
    const data = EVENT_DATA[eventKey];
    if (!data) return;

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

    // Coordinators
    elCoords.innerHTML = data.coordinators.map(c =>
        `<div class="coordinator-card">
            <p class="coordinator-name">${c.name}</p>
            <p class="coordinator-phone">${c.phone}</p>
        </div>`
    ).join('');

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
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
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
    const title = document.querySelector('.splash-title');
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
    gsap.set(title, { opacity: 0, scale: 1.1, filter: "blur(15px)", letterSpacing: "20px" });
    gsap.set(subtitle, { opacity: 0, scale: 1.1, filter: "blur(10px)", letterSpacing: "15px" });
    gsap.set(line, { width: "0%" });

    introTl.to(title, {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        letterSpacing: "0px",
        duration: 1.5,
        ease: "expo.out"
    }, 1.6);

    introTl.to(subtitle, {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        letterSpacing: "5px",
        duration: 1.5,
        ease: "expo.out"
    }, 1.7);

    introTl.to(line, {
        width: "100%",
        duration: 1.5,
        ease: "expo.out"
    }, 1.6);

    // Hold briefly before unlocking screen
    introTl.to({}, { duration: 0.3 });
});
