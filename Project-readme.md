# Project Structure Guide (Version 1)

Welcome to the Tinkering Lab projects framework! We've made it incredibly easy to add new projects. You no longer need to manually configure paths for every image, poster, 3D model, or code file in your `project.json`. 

Instead, our automated build script will scan your project folder and detect everything automatically!

## 📂 Directory Structure

Create a new folder for your project (e.g., `projects/Level-3/my-new-project/`). Place all your files directly inside this folder.

### Magic Filenames
The system looks for specific filenames to automatically categorize your files:

- **`icon.png` (or `.jpg`, `.webp`)**: Automatically used as the main thumbnail for the project card.
- **`banner.png` (or `banner1.jpg`, `banner2.png`, etc.)**: Automatically used as the large hero background image at the top of the project detail page. Multiple banners will automatically create a sliding carousel!
- **`poster1.png`**: Automatically categorized as the **Problem Statement** poster.
- **`poster2.png`**: Automatically categorized as the **Solution & Methodology** poster.
- **`poster3.png`**: Automatically categorized as the **Future Scope** poster.

### Other Auto-Detected Files
You can name these whatever you like; the system detects them by their file extension!

- **Gallery Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`)**: Any image in the folder will automatically be added to the project's Gallery tab. 
- **Videos (`.mp4`, `.webm`, `.mkv`, `.mov`)**: Any video file will automatically appear in the Local Videos tab.
- **Code Files (`.ino`, `.cpp`, `.h`, `.md`)**: Any code file will automatically appear in the Code tab.
- **3D Models (`.stl`)**: Any `.stl` file will automatically appear in the 3D Printing tab with a 3D viewer and download link.
- **Firmware (`.bin`)**: Any `.bin` file will automatically appear in the Code tab as a flashable firmware payload.
- **Presentations/Research (`.pdf`)**: Any PDF will automatically appear in the Presentation tab as an embedded viewer.

## 📝 The `project.json` File

You still need a `project.json` file in your folder to define the text content (title, description, hardware specs, etc.). 

**Example `my-new-project.json`:**
```json
{
  "id": "my-new-project",
  "title": "My Awesome Project",
  "desc": "A short summary of what this does.",
  "fullDesc": "A much longer description with paragraphs...",
  "level": "Level 3",
  "difficulty": 3,
  "author": "John Doe",
  "date": "Oct 2024",
  "hardwareSpecs": {
    "microcontroller": "Arduino Uno",
    "powerSupply": "5V USB"
  },
  "componentRefs": [
    "arduino_uno",
    "dht11"
  ]
}
```

*Notice how you didn't have to add `gallery`, `codeFiles`, `files3d`, or `posters`!*

## 🚀 How to Update the System

Once you've placed your files and created your JSON file:

1. Add your project's JSON path to the `projects` array in `projects/projects.json`.
2. Run the update script from your terminal:
   ```bash
   node js/update_projects.js
   ```

This script will scan your folder, find all your magic files, images, PDFs, and code, and safely update your JSON file with the correct arrays. Your project is now ready to view!
