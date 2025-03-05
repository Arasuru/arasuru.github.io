document.addEventListener('DOMContentLoaded', () => {
    const projectTiles = document.querySelectorAll('.project-tile');
    const navLinks = document.querySelectorAll('nav ul li a');

    // Add tooltip functionality to project tiles
    projectTiles.forEach(tile => {
        tile.addEventListener('mouseover', (event) => {
            const details = event.target.getAttribute('data-details');
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.innerHTML = details;
            tile.appendChild(tooltip);

            tile.addEventListener('mouseout', () => {
                tile.removeChild(tooltip);
            }, { once: true });
        });
    });

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
