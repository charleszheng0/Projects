# I'm creating a portfolio website for myself. I'll plug in some information, but I want you to create it based off of Siddarth Bellad's portfolio website. https://siddharth-bellad-portfolio.vercel.app/ I need the incorporation of the cursor being able to affect the backdrop's graphics. 

Like his sections, I'm going to need to create a resume, about, education, experience, projects, etc. On the other side, it should include resume link and intro of myself. 

Next, add features like this website: https://antfu.me/. It has the Aesthetic: "Digital Zen with futuristic backdrop similar to Bellad's website with the web of connections."
The site feels like a high-end code editor brought to life. It uses a monochrome, dark-themed palette (based on his own Vitesse Theme) that emphasizes typography and spacing over heavy graphics. Everything is clean, utilizing a "system-ui" feel that makes the technical content feel breathable.

The "Fade and Slide" Experience
The most striking feature is the Sliding Enter Animation. As you navigate from page to page or scroll through a blog post:

Staggered Entry: Elements don't just appear; they "float" into place. Each paragraph, heading, and image has a slight 10px upward slide combined with a fade-in.   

Sequential Timing: He uses CSS counters and nth-child selectors to stagger the timing. This means the top of the page fades in first, followed by the middle, then the bottom, creating a "waterfall" effect of content revealing itself as you look at it.

Micro-Interactions: Subtle hover states and smooth transitions between light and dark modes reinforce a feeling of "polish" rather than "flashiness."

Navigation & Layout
Minimalist Header: A simple set of text links (Blog, Projects, Talks, etc.) and social icons. 

It should feel less like a static resume and more like an active intelligence. While Anthony Fu’s site is "Digital Zen," my "Futuristic" portfolio should lean into Predictive Minimalism—an interface that feels like it’s thinking with the user.Here is a prompt-like description of a portfolio designed for that intersection:The Aesthetic: "The Cognitive Interface"Visual Language: Moving away from standard dark mode into a "Glassmorphism" or "HUD" (Heads-Up Display) aesthetic. Think semi-transparent layers, blurred backgrounds, and thin, glowing borders that suggest a high-tech lab environment.Color Palette: Deep navy or "Obsidian" backgrounds with accents of Electric Cyan or Bioluminescent Green to represent active data streams.The "Predictive" Interactive ExperienceInstead of simple fades, your site uses Data-Driven Transitions:Generative Entry: As you enter, a light "mesh" or neural network graph subtly connects dots in the background, reacting to your cursor movement—symbolizing human-machine interaction.The "Insight" Reveal: When scrolling to a project, the content doesn't just slide; As you scroll, the objects don't just appear; they materialize. This subtle motion exploits the human brain's orienting reflex, which is naturally tuned to detect changes in the visual field. By fading in specific elements as they enter your "attentional spotlight," the site ensures your brain prioritizes the current piece of information (like a specific technical capability or statistic) before moving to the next.
Typography: Use high-legibility "Code" fonts (like JetBrains Mono) for data points, paired with a sleek Sans-Serif (like Inter) for prose.Micro-Signals: Use small pulsing "status" lights (green for "Live Project," amber for "Research in Progress") to make the site feel like a living dashboard.

Overall Style

Dark, high-contrast, edgy, futuristic minimalistic

Matte blacks and near-black gradients at the edges

Muted accent color only (deep violet, cold blue, or desaturated crimson — not vibrant)

No glossy sci-fi; feels underground, technical, intentional

3D Visual / Hero Element Prompt

Subject

Partial human head (left or right profile) OR exposed brain emerging from darkness

Head dissolves into:

Particle clusters

Jagged wireframe fragments

Broken neural strands

Not smooth or perfect — slight asymmetry and roughness encouraged

Material & Look

Dark base material, low reflectivity

Edge highlights only (rim-lit)

Internal glow is faint and uneven

Looks like intelligence under stress or computation, not “pretty AI”

Motion (Important — Jerky Allowed)

Rotation is:

Slightly stuttered

Non-uniform

Feels glitchy or imperfect

Particles occasionally snap or jitter

Micro camera shake is acceptable

No easing obsession — raw motion is fine

Particle Web

Sparse, sharp points of light

Thin, angular connecting lines (not smooth curves)

Lines fade in/out abruptly

Depth feels real but hostile / technical

Background

Almost black

Vignette heavy around edges

Very subtle noise or grain

Background movement is minimal but not smooth (slow drift + random offsets)

Camera

Fixed or slow orbital

No cinematic flourish

Depth > beauty

UI / NAVIGATION REQUIREMENTS (MANDATORY)

Top-Left Menu Button

Position: top-left corner, fixed

Minimal icon (☰ or three sharp lines)

White or muted gray, no glow

On hover: slight opacity change or underline

Dropdown Menu Items (Exact Order)

Home

About

Experience

Projects

Dropdown Behavior

Appears vertically beneath button

Dark background panel

Sharp corners (no rounded bubbles)

Subtle slide or fade (can be slightly jerky)

For home, it should be a somewhat large "intro" of me: 
For the text under that, it should say "a builder that thinks change" or anything better worded. 

In about, say that I'm a duke first year ECE/CS student that wants to build and deploy. 

Do not have the blurry box you have implemented right now in the home page. I want to make this distinguishable from AI slop. 

WHENEVER YOU ARE GOING FROM PAGE TO PAGE THERE SHOULD BE A JUMP TO A DIFFERENT PAGE OF THE WEBSITE

1. Stack (Do Not Overcomplicate)

Frontend

Next.js (App Router)

TypeScript

Tailwind CSS

Framer Motion (transitions + materialization)

Three.js + @react-three/fiber + drei (brain mesh)

GSAP (optional) for fine-grained scroll control

This stack is already used in portfolios like Mahtab’s for a reason.

2. Site Structure (Dropdown + Dedicated Subpages)
URL Architecture
/
├── /about
├── /projects
│   ├── /intelligence
│   ├── /systems
│   ├── /research
│   └── /experiments
├── /skills
└── /contact

Smooth Dropdown (Navbar)

Use Framer Motion + Radix UI (or Headless UI) for accessibility and smoothness.

<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.25, ease: "easeOut" }}
  className="absolute top-full mt-3 glass-panel"
>
  <Link href="/projects/intelligence">Intelligence</Link>
  <Link href="/projects/systems">Systems</Link>
  <Link href="/projects/research">Research</Link>
</motion.div>


Glass Panel Utility

.glass-panel {
  backdrop-filter: blur(12px);
  background: rgba(10, 15, 20, 0.55);
  border: 1px solid rgba(0, 255, 200, 0.15);
  box-shadow: 0 0 20px rgba(0, 255, 200, 0.05);
}

3. First Name → Hover Reveal Last Name (Exact Effect)

This is simple but needs precise timing.

<div className="relative group inline-flex items-baseline">
  <span className="text-6xl font-bold">CHARLES</span>

  <motion.span
    initial={{ opacity: 0, x: -8 }}
    whileHover={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.25 }}
    className="ml-2 text-6xl font-bold text-cyan-400 opacity-0 group-hover:opacity-100"
  >
    ZHENG
  </motion.span>
</div>


Key:

Last name does not exist visually until hover

Slight horizontal slide triggers the orienting reflex

4. Brain: Particle Mesh Neural Object (Three.js)
Core Concept

Points-based mesh

Noise-driven rotation

Shader glow

Subtle breathing motion

Camera parallax on mouse move

Implementation
<Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
  <ambientLight intensity={0.5} />
  <pointLight position={[5, 5, 5]} intensity={1.2} />

  <Brain />
</Canvas>

Brain Component (Particles)
const Brain = () => {
  const ref = useRef<any>()

  useFrame(({ clock, mouse }) => {
    ref.current.rotation.y += 0.0015
    ref.current.rotation.x = mouse.y * 0.15
    ref.current.rotation.y += mouse.x * 0.15
  })

  return (
    <Points ref={ref}>
      <sphereGeometry args={[1.2, 64, 64]} />
      <pointsMaterial
        color="#7CFFCB"
        size={0.015}
        transparent
        opacity={0.9}
        blending={AdditiveBlending}
      />
    </Points>
  )
}

Upgrade (Optional, Recommended)

Replace sphere with custom brain point cloud

Use Perlin noise distortion

Custom GLSL shader for pulse glow

This is how you get the “alive” look in the screenshot.

5. “Cognitive Interface” Aesthetic (Glass + HUD)
Global Styling Rules
body {
  background: radial-gradient(circle at top, #0b1220, #020409);
  color: #e6faff;
}

.hud-border {
  border: 1px solid rgba(0, 255, 200, 0.2);
  box-shadow: inset 0 0 12px rgba(0, 255, 200, 0.08);
}

Accent Colors

Primary: #00FFC6 (Bioluminescent Green)

Secondary: #00D4FF (Electric Cyan)

Background: #020409 / #0B1220

6. “Predictive” Scroll-Based Materialization (Critical)

This is where most portfolios fail.

Rule:

Nothing slides. Everything assembles.

<motion.div
  initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
  whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
  transition={{ duration: 0.6, ease: "easeOut" }}
  viewport={{ once: true, margin: "-100px" }}
>
  <ProjectCard />
</motion.div>


Why this works:

Blur → clarity mimics perceptual recognition

Scale ≈ object “locking into focus”

7. Neural Background Mesh (Cursor Reactive)

Use canvas + particles, NOT DOM.

Libraries:

react-tsparticles (fast)

or custom Three.js line graph

Behavior:

Nodes subtly repel from cursor

Lines fade in/out based on proximity

This reinforces human–machine interaction subconsciously.

8. Page-Specific Identity (Each Subpage)

Each project page should have:

Different brain state (color, speed, density)

Different accent hue

Different interaction sensitivity

Example:

Intelligence → Fast pulse, cyan glow

Systems → Slow rotation, green grid

Research → Minimal motion, white noise