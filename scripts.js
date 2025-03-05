// Add any JavaScript functionality here
document.addEventListener('DOMContentLoaded', () => {
    const projectTiles = document.querySelectorAll('.project-tile');

    projectTiles.forEach(tile => {
        tile.addEventListener('mouseover', (event) => {
            const details = event.target.getAttribute('data-details');
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.innerHTML = details;
            document.body.appendChild(tooltip);

            const rect = event.target.getBoundingClientRect();
            tooltip.style.left = `${rect.left}px`;
            tooltip.style.top = `${rect.bottom + 5}px`;

            tile.addEventListener('mouseout', () => {
                document.body.removeChild(tooltip);
            }, { once: true });
        });
    });
});
