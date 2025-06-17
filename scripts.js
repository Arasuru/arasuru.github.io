document.addEventListener('DOMContentLoaded', () => {
    
    const navLinks = document.querySelectorAll('nav ul li a');

    // Add smooth scrolling functionality to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = event.target.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            window.scrollTo({
                top: targetSection.offsetTop,
                behavior: 'smooth'
            });
        });
    });
});

