document.addEventListener('DOMContentLoaded', () => {
    const projectTiles = document.querySelectorAll('.project-tile');

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
});
