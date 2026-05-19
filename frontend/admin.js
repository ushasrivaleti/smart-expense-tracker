document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('feedback-grid');
    const loading = document.getElementById('loading');
    const errorMsg = document.getElementById('error-message');

    try {
        const response = await fetch('http://localhost:5000/api/feedback');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const feedbacks = await response.json();
        loading.style.display = 'none';

        if (feedbacks.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No feedback received yet.</p>';
            return;
        }

        feedbacks.forEach(fb => {
            const card = document.createElement('div');
            card.className = 'glass-panel feedback-card';
            
            const date = new Date(fb.createdAt).toLocaleString();
            const stars = '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating);

            card.innerHTML = `
                <div class="fb-header">
                    <div>
                        <div class="fb-name">${fb.name}</div>
                        <div class="fb-email">${fb.email}</div>
                    </div>
                    <div class="fb-rating" title="${fb.rating} out of 5">${stars}</div>
                </div>
                <div class="fb-comments" style="margin-top: 12px; line-height: 1.5;">
                    ${escapeHTML(fb.comments)}
                </div>
                <div class="fb-date">${date}</div>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching feedback:', error);
        loading.style.display = 'none';
        errorMsg.style.display = 'block';
    }
});

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
