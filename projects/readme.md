# VidyaSTEM Projects Directory Guide

Welcome to the `projects` directory! This is where all the project data for the **Projects Gallery** is stored.

This document explains how projects are structured, how to add a new project (including a live webpage project), and how filtering works on the platform.

---

## 1. Directory Structure

- **`projects.json`**: The master index file. Every project JSON file must be listed here.
- **`[1-n]project.json`**: Individual project data files containing metadata, guides, and resource links.
- **`images/`**: (Optional but recommended) Folder to store project thumbnail images.
- **Live Project Folders** (e.g., `sketching-live-main/`): Folders containing standalone HTML, CSS, and JS for projects that run directly in the browser.

---

## 2. Project JSON Schema

Each project has a dedicated JSON file. Here is the structure and what each field means:

```json
{
  "id": "smart-alert",
  "title": "Smart Alert System",
  "level": "Advanced",
  "color": "#FF4757",
  "session": 4,
  "desc": "Short description shown on the card.",
  "fullDesc": "Longer description shown in the project detail view.",
  "image": "projects/images/smart-alert.jpg",
  
  "components": [
    "ESP8266 NodeMCU",
    "PIR Motion Sensor"
  ],
  
  "guide": [
    "Step 1: Connect the PIR sensor to the ESP8266.",
    "Step 2: Upload the provided Arduino sketch.",
    "Step 3: Test the motion detection."
  ],
  
  "difficulty": 5,
  "status": "Available",
  
  "tags": [
    "ESP8266",
    "IoT",
    "Security"
  ],
  
  "date": "2025-09-01",
  "author": "Tinkering Lab",
  
  "liveUrl": "projects/sketching-live-main/index.html",
  
  "files3d": [],
  "codeFiles": [],
  "youtubeVideos": [],
  "dataVideos": [],
  "gallery": [],
  "resources": []
}
```

### Key Fields:
- **`image`**: Must point to a valid image path. If the image fails to load, the system falls back to the Vidya logo.
- **`guide`**: An array of steps. This replaces the old `skills` field and generates a numbered Step-by-Step guide in the UI.
- **`tags`**: This is **crucial for filtering**. Any tag you put here (e.g., `Arduino Uno`, `ESP32`) will automatically become a filter button at the top of the Projects Gallery.
- **`liveUrl`**: Provide the path to an `index.html` file here to enable the "Launch Live Project" button. This allows users to execute projects (like coding editors or interactive web tools) directly from the platform.

---

## 3. How to Add a New Project

1. **Create a JSON File**: Copy an existing project (e.g., `1project.json`) and name it sequentially (e.g., `8project.json`).
2. **Update the JSON**: Fill in your project's details following the schema above.
3. **Register the Project**: Open `projects/projects.json` and add your new file to the array.
   ```json
   "projects": [
     "projects/1project.json",
     "...",
     "projects/8project.json"
   ]
   ```
4. **Add Images**: Place your project's main image in a reachable path (like `projects/images/`) and set the `"image"` field.
5. **(Optional) Add a Live Webpage**: If your project has a web interface, place its folder in `projects/` (e.g., `projects/my-cool-project/index.html`) and set `"liveUrl": "projects/my-cool-project/index.html"` in the JSON.

---

## 4. How Filters Work

The top filter bar in the Projects Gallery is fully **dynamic**. 

When the page loads, it scans the `"tags"` array of all available projects. It then automatically creates filter buttons for every unique tag found. 

To add a new filter like "Micro:bit", simply add `"Micro:bit"` to the `"tags"` array of at least one project. When the project is loaded, the filter will appear automatically.
