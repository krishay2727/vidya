// =============================================
//  GLOBAL STATE
// =============================================
let SITE = null;          // site.json
let SESSIONS = {};        // { id: sessionData }
let PROJECTS = [];        // from projects.json
let currentSession = null;
let currentSlide = 0;
let inlineQuizState = {};
let currentProject = null;
