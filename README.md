# Vidya STEAM Education Website
## How to Use & Add New Content

---

## 📁 Folder Structure

```
vidya-steam/
│
├── index.html              ← Main website (open this in browser)
├── style.css               ← All styles
├── app.js                  ← All JavaScript
├── site.json               ← MASTER CONFIG (add new sessions here)
│
├── sessions/
│   ├── session-1/
│   │   ├── session.json    ← Session 1 data (title, quiz, topics, etc.)
│   │   ├── slides/
│   │   │   ├── slide-01.jpg   ← Exported PPT slides (JPG/PNG)
│   │   │   ├── slide-02.jpg
│   │   │   ├── ...
│   │   │   └── slides.pdf     ← OR put PDF here instead of images
│   │   └── images/
│   │       ├── img-01.jpg     ← Lab photos, activity pics, component shots
│   │       ├── img-02.jpg
│   │       └── ...
│   │
│   ├── session-2/          ← Same structure
│   └── session-3/          ← Same structure
│
├── projects/
│   ├── projects.json       ← All project cards data
│   └── images/
│       ├── smart-light.jpg
│       ├── weather-station.jpg
│       └── ...
```

---

## ➕ HOW TO ADD A NEW SESSION

### Step 1 — Create Folder
```
sessions/session-4/
sessions/session-4/slides/
sessions/session-4/images/
```

### Step 2 — Export PPT Slides as Images
- Open your PPT in PowerPoint
- File → Export → Change File Type → JPEG or PNG
- Click "Save All Slides"
- Copy the exported images into `sessions/session-4/slides/`
- Rename them: `slide-01.jpg`, `slide-02.jpg`, `slide-03.jpg` …

**OR** — Export as PDF:
- File → Export → Create PDF/XPS
- Save as `slides.pdf` inside `sessions/session-4/slides/`

### Step 3 — Create session.json
Copy `sessions/session-1/session.json` to `sessions/session-4/session.json`

Edit these fields:
```json
{
  "id": "session-4",
  "number": 4,
  "title": "Your Session Title",
  "subtitle": "Short description",
  "date": "Session 04",
  "duration": "75 minutes",
  "phase": "Sensors",
  "color": "#9B6BFF",
  "icon": "🌡️",
  "tags": ["Sensor", "Arduino", "Code"],
  "overview": "What this session is about...",

  "slides": {
    "pdf": "sessions/session-4/slides/slides.pdf",
    "images": [
      {
        "file": "sessions/session-4/slides/slide-01.jpg",
        "title": "Slide 1 Title",
        "caption": "What this slide shows"
      }
    ]
  },

  "images": {
    "gallery": [
      {
        "file": "sessions/session-4/images/img-01.jpg",
        "caption": "Photo description",
        "category": "Lab"
      }
    ]
  },

  "keyTopics": ["Topic 1", "Topic 2"],

  "youtubeVideos": [
    {
      "title": "Video Title",
      "videoId": "YOUTUBE_VIDEO_ID",
      "desc": "What this video covers"
    }
  ],

  "resources": [
    { "title": "Website Name", "url": "https://...", "icon": "🔗" }
  ],

  "activity": {
    "title": "Activity Name",
    "parts": ["Part 1", "Part 2"],
    "steps": ["Step 1", "Step 2"]
  },

  "quiz": [
    {
      "q": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Why A is correct..."
    }
  ]
}
```

### Step 4 — Register in site.json
Open `site.json` and add to the sessions array:
```json
"sessions": [
  { "id": "session-1", "number": 1, "file": "sessions/session-1/session.json" },
  { "id": "session-2", "number": 2, "file": "sessions/session-2/session.json" },
  { "id": "session-3", "number": 3, "file": "sessions/session-3/session.json" },
  { "id": "session-4", "number": 4, "file": "sessions/session-4/session.json" }
]
```

**Done!** Open the website and the new session will appear automatically.

---

## 🖼️ Adding Images to a Session

1. Take photos during the session (lab activity, student work, components)
2. Copy photos into `sessions/session-X/images/`
3. Open `sessions/session-X/session.json`
4. Add entries to `images.gallery`:

```json
"images": {
  "gallery": [
    {
      "file": "sessions/session-1/images/my-photo.jpg",
      "caption": "Students building LED circuits",
      "category": "Lab"
    }
  ]
}
```

Categories can be: `Lab`, `Activity`, `Components`, `Code`, `Concept`, or anything you like.

---

## 🎬 Adding YouTube Videos

Find the video on YouTube. The ID is in the URL:
`https://www.youtube.com/watch?v=`**`dQw4w9WgXcQ`** ← this part

```json
"youtubeVideos": [
  {
    "title": "Arduino Blink Tutorial",
    "videoId": "dQw4w9WgXcQ",
    "desc": "How to make an LED blink with Arduino"
  }
]
```

---

## 🧠 Adding Quiz Questions

```json
{
  "q": "What does LED stand for?",
  "options": [
    "Light Emitting Diode",
    "Low Energy Device",
    "Light Energy Driver",
    "Large Electric Display"
  ],
  "answer": 0,
  "explanation": "LED = Light Emitting Diode! It emits light when electricity flows through it."
}
```

- `"answer"` is the index (0=A, 1=B, 2=C, 3=D)
- Add as many questions as you want — the quiz shuffles them randomly each time

---

## 🚀 Adding a New Project

Open `projects/projects.json` and add to the `projects` array:

```json
{
  "id": "my-project",
  "title": "My Cool Project",
  "icon": "🔥",
  "level": "Intermediate",
  "session": 2,
  "desc": "Short description for the card",
  "fullDesc": "Detailed description...",
  "image": "projects/images/my-project.jpg",
  "components": ["Arduino UNO", "LED", "Sensor"],
  "skills": ["Coding", "Circuit building"],
  "difficulty": 3,
  "status": "Available"
}
```

- `level`: "Beginner" / "Intermediate" / "Advanced"
- `status`: "Available" / "Coming Soon"
- `difficulty`: 1-5

---

## 🌐 Running the Website

Since it loads JSON files via `fetch()`, you need a local server:

**Option 1 — VS Code Live Server** (recommended)
- Install "Live Server" extension in VS Code
- Right-click `index.html` → Open with Live Server

**Option 2 — Python**
```bash
cd vidya-steam
python3 -m http.server 8000
# Open: http://localhost:8000
```

**Option 3 — Node.js**
```bash
npx serve .
```

> ⚠️ Do NOT just double-click `index.html` — it won't load the JSON files due to browser security.

---

*Vidya STEAM Education · Build. Break. Learn. Repeat. ⚡*
