document.addEventListener('DOMContentLoaded', () => {
    // State management
    let allEntries = [];
    let filteredEntries = [];
    let selectedCategories = new Set(['Feature', 'Issue', 'Announcement', 'Breaking', 'Change']);
    let searchQuery = '';

    // UI elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshSpinner = refreshBtn.querySelector('.spinner');
    const lastUpdatedSpan = document.getElementById('last-updated');
    const searchInput = document.getElementById('search-input');
    const timelineContainer = document.getElementById('timeline-container');
    const categoryCheckboxes = document.querySelectorAll('.category-checkboxes input');
    
    // Stats elements
    const totalCountVal = document.getElementById('stat-total');
    const featureCountSpan = document.getElementById('count-feature');
    const issueCountSpan = document.getElementById('count-issue');
    const breakingCountSpan = document.getElementById('count-breaking');
    const announceCountSpan = document.getElementById('count-announce');
    const changeCountSpan = document.getElementById('count-change');

    // Tweet Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const tweetCharCount = document.getElementById('tweet-char-count');
    const publishTweetBtn = document.getElementById('publish-tweet-btn');
    const closeTweetBtn = document.getElementById('close-tweet-btn');
    
    // Current tweet state
    let currentTweetUrl = '';

    // Initialize the app
    fetchReleaseNotes();

    // Event listeners
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().stripOrEmpty();
        filterAndRender();
    });

    categoryCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const category = cb.value;
            if (cb.checked) {
                selectedCategories.add(category);
            } else {
                selectedCategories.delete(category);
            }
            filterAndRender();
        });
    });

    // Helper to clean spacing
    String.prototype.stripOrEmpty = function() {
        return this.trim();
    };

    // Fetch API
    async function fetchReleaseNotes(forceRefresh = false) {
        setLoadingState(true);
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to retrieve release notes from feed.');
            }
            
            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            
            allEntries = result.data || [];
            
            // Show toast warning if server served cached data due to API failure
            if (result.warning) {
                showToast(result.warning, 'error');
            } else if (forceRefresh) {
                showToast('Release notes successfully refreshed!', 'success');
            }

            // Update last updated timestamp
            const updatedTime = result.cached_at 
                ? new Date(result.cached_at * 1000) 
                : new Date();
            lastUpdatedSpan.textContent = `Synced: ${updatedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            
            // Calculate total categories and update stats
            calculateStats();
            filterAndRender();
            
        } catch (err) {
            console.error(err);
            showToast(err.message || 'An error occurred while loading release notes.', 'error');
            renderEmptyState('Failed to Load Content', 'Please verify your connection and try refreshing again.');
        } finally {
            setLoadingState(false);
        }
    }

    // Set loading UI
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshSpinner.style.display = 'inline-block';
            refreshBtn.disabled = true;
            if (allEntries.length === 0) {
                timelineContainer.innerHTML = `
                    <div class="loading-state">
                        <svg class="spinner" viewBox="0 0 50 50">
                            <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" stroke="currentColor"></circle>
                        </svg>
                        <h3>Loading BigQuery Release Notes...</h3>
                        <p>Fetching and parsing Google Cloud feeds</p>
                    </div>
                `;
            }
        } else {
            refreshSpinner.style.display = 'none';
            refreshBtn.disabled = false;
        }
    }

    // Calculate sidebar stats
    function calculateStats() {
        let total = 0;
        let counts = {
            'Feature': 0,
            'Issue': 0,
            'Breaking': 0,
            'Announcement': 0,
            'Change': 0
        };

        allEntries.forEach(entry => {
            (entry.notes || []).forEach(note => {
                total++;
                if (counts[note.type] !== undefined) {
                    counts[note.type]++;
                }
            });
        });

        // Update UI
        totalCountVal.textContent = total;
        featureCountSpan.textContent = counts['Feature'];
        issueCountSpan.textContent = counts['Issue'];
        breakingCountSpan.textContent = counts['Breaking'];
        announceCountSpan.textContent = counts['Announcement'];
        changeCountSpan.textContent = counts['Change'];
    }

    // Filter and Render logic
    function filterAndRender() {
        if (allEntries.length === 0) return;

        filteredEntries = [];

        allEntries.forEach(entry => {
            // Filter notes inside each entry
            const matchingNotes = (entry.notes || []).filter(note => {
                const categoryMatch = selectedCategories.has(note.type);
                const searchMatch = !searchQuery || 
                    note.type.toLowerCase().includes(searchQuery) || 
                    note.text.toLowerCase().includes(searchQuery) ||
                    entry.date.toLowerCase().includes(searchQuery);
                
                return categoryMatch && searchMatch;
            });

            if (matchingNotes.length > 0) {
                filteredEntries.push({
                    ...entry,
                    notes: matchingNotes
                });
            }
        });

        renderTimeline();
    }

    // Render HTML Timeline
    function renderTimeline() {
        if (filteredEntries.length === 0) {
            renderEmptyState('No Release Notes Found', 'Try adjusting your search filters or selecting more categories.');
            return;
        }

        let htmlContent = '';

        filteredEntries.forEach(entry => {
            htmlContent += `
                <div class="timeline-group">
                    <div class="timeline-date-header">
                        <span class="timeline-date-text">${entry.date}</span>
                        <div class="timeline-line"></div>
                    </div>
            `;

            entry.notes.forEach((note, index) => {
                const typeClass = note.type.toLowerCase();
                const typeGlowColor = `var(--color-${typeClass})`;
                
                // Truncate plain text preview for data attributes
                const cleanNoteText = escapeHtml(note.text);
                const cleanLink = escapeHtml(entry.link);
                const cleanDate = escapeHtml(entry.date);
                
                htmlContent += `
                    <div class="release-card" style="--type-color: var(--color-${typeClass})">
                        <div class="card-header">
                            <span class="badge" style="--badge-bg: var(--color-${typeClass}-bg); --badge-fg: var(--color-${typeClass})">
                                ${note.type}
                            </span>
                            <div class="card-actions">
                                <button class="action-btn tweet-btn" 
                                        data-text="${cleanNoteText}" 
                                        data-link="${cleanLink}" 
                                        data-date="${cleanDate}"
                                        title="Tweet about this update">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="card-content">
                            ${note.html}
                        </div>
                    </div>
                `;
            });

            htmlContent += `</div>`;
        });

        timelineContainer.innerHTML = htmlContent;
        setupTweetButtons();
    }

    function renderEmptyState(title, subtitle) {
        timelineContainer.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <h3>${title}</h3>
                <p>${subtitle}</p>
            </div>
        `;
    }

    // Modal management for Twitter
    function setupTweetButtons() {
        const tweetButtons = document.querySelectorAll('.tweet-btn');
        tweetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const noteText = btn.getAttribute('data-text');
                const noteLink = btn.getAttribute('data-link');
                const noteDate = btn.getAttribute('data-date');
                
                openTweetModal(noteText, noteLink, noteDate);
            });
        });
    }

    function openTweetModal(text, link, date) {
        currentTweetUrl = link;
        
        // Construct a clean, professional prefilled tweet
        // Format: "Google BigQuery Update (June 15, 2026): [Feature details...] via @GoogleCloud #BigQuery"
        const header = `BigQuery Update (${date}): `;
        const footer = ` #GoogleCloud #BigQuery`;
        
        // Max characters: 280.
        // X counts any URL as exactly 23 characters.
        // So character count space for text is: 280 - 23 (for URL) - 1 (space before URL) = 256.
        const allowedTextLen = 256 - header.length - footer.length;
        
        let bodyText = text;
        if (bodyText.length > allowedTextLen) {
            bodyText = bodyText.substring(0, allowedTextLen - 3) + '...';
        }
        
        const fullPrefilledText = `${header}${bodyText}${footer}`;
        
        tweetTextarea.value = fullPrefilledText;
        updateCharCount();
        
        tweetModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock background scrolling
    }

    function closeTweetModal() {
        tweetModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updateCharCount() {
        const textVal = tweetTextarea.value;
        const currentLength = textVal.length;
        
        // Since URL takes 23 characters, total tweet size = currentLength + 24 (url + space)
        const totalEstimatedLength = currentLength + 24;
        const remaining = 280 - totalEstimatedLength;
        
        tweetCharCount.textContent = `${totalEstimatedLength} / 280 characters`;
        
        if (remaining < 0) {
            tweetCharCount.className = 'char-counter danger';
            publishTweetBtn.disabled = true;
        } else if (remaining < 30) {
            tweetCharCount.className = 'char-counter warning';
            publishTweetBtn.disabled = false;
        } else {
            tweetCharCount.className = 'char-counter';
            publishTweetBtn.disabled = false;
        }
    }

    // Modal action buttons
    closeTweetBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    tweetTextarea.addEventListener('input', updateCharCount);

    publishTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(currentTweetUrl)}`;
        window.open(shareUrl, '_blank');
        closeTweetModal();
        showToast('Opened Twitter share page in a new window!', 'success');
    });

    // Toast alerts helper
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${escapeHtml(message)}</span>
            <button style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.1rem; padding-left:10px;">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 50);
        
        // Bind close button
        toast.querySelector('button').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
        
        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // Helper functions
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
