/**
 * Reusable typewriter effect
 * @param {string} targetId - The ID of the target element
 * @param {string} text - The text to type
 * @param {number} speed - Typing speed in milliseconds
 */
function initTypewriter(targetId, text, speed = 50) {
    const typeTarget = document.getElementById(targetId);
    if (!typeTarget) return;
    
    typeTarget.textContent = text;
    const fullHeight = typeTarget.scrollHeight;
    typeTarget.style.height = fullHeight + "px";
    typeTarget.style.minHeight = fullHeight + "px";
    typeTarget.textContent = "";
    
    let charIndex = 0;

    function typeChar() {
        if (charIndex < text.length) {
            typeTarget.textContent = text.slice(0, charIndex + 1);
            charIndex++;
            setTimeout(typeChar, speed);
        }
    }

    typeChar();
}

// Define text constants
const HOME_TEXT = "Hi, I'm Ibrahim Shaheen, a Digital Transformation professional specializing in AI, people technology, and strategic digitalization. Currently at NEOM, I lead initiatives that turn complex processes into intelligent, automated systems, aiming for a 70% automation rate and earning SAP's Best HCM Innovation & Automation Award in KSA.";
const ABOUT_TEXT = "Hello! I'm Ibrahim Shaheen (Ibra), a Saudi Digital Transformation professional focused on AI, people technology, and strategic digitalization.\n\nAs a People Technology Senior Specialist at NEOM, I lead initiatives that turn complex processes into intelligent, automated systems, aiming for a 70% automation rate and earning SAP's Best HCM Innovation & Automation Award in KSA.\n\nI'm passionate about using AI to solve real problems, from streamlining HRIS platforms like SAP SuccessFactors to building AI agents that support people around the clock.";

// Auto-initialize based on page
document.addEventListener('DOMContentLoaded', function() {
    // For home page
    if (document.getElementById('type-target')) {
        initTypewriter('type-target', HOME_TEXT);
    }
    
    // For about page
    if (document.getElementById('about-type-target')) {
        initTypewriter('about-type-target', ABOUT_TEXT);
        
        // Fade in profile picture if it exists
        const profilePic = document.getElementById('profile-pic');
        if (profilePic) {
            profilePic.classList.add('fade-in');
        }
    }
});
