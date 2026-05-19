// --- Local Error Handler ---
window.onerror = function(msg, url, line, col, error) {
    const errorDetail = `${msg} (Line: ${line})`;
    console.error("[Global Error]", errorDetail);
    return false;
};

// --- Store included via tag ---
// const store = window.store (instance created in store_new.js)

// ========== Auto-Categorization Logic ==========
const categoryKeywords = {
    food: ['food', 'lunch', 'dinner', 'breakfast', 'restaurant', 'mcdonalds', 'kfc', 'cafe', 'coffee', 'groceries', 'walmart', 'pizza', 'swiggy', 'zomato', 'canteen', 'maggi', 'chai'],
    transportation: ['uber', 'lyft', 'taxi', 'bus', 'train', 'gas', 'fuel', 'metro', 'flight', 'ticket', 'petrol', 'auto', 'rickshaw'],
    shopping: ['amazon', 'clothes', 'shoes', 'mall', 'myntra', 'flipkart', 'ebay', 'electronics', 'apple', 'fashion', 'book', 'stationary', 'laptop'],
    bills: ['electricity', 'water', 'internet', 'wifi', 'rent', 'phone', 'recharge', 'subscription', 'netflix', 'spotify', 'hostel', 'pg'],
    entertainment: ['movie', 'cinema', 'game', 'steam', 'concert', 'club', 'party', 'bowling', 'pub', 'netflix', 'prime', 'hotstar']
};

function autoCategorize(description) {
    const descLower = description.toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => descLower.includes(kw))) {
            return category;
        }
    }

    return 'other'; // default fallback
}

// ========== UI Managers ==========

class DashboardManager {
    static update() {
        const totalSpent = store.getTotalSpent();
        const budget = store.getBudget();
        const savingsGoal = store.getSavingsGoal();
        const projectedTotal = store.getProjectedMonthlySpending();
        const percentUsed = (totalSpent / budget) * 100;
        const projectedPercent = (projectedTotal / budget) * 100;

        const projectedSavings = Math.max(0, budget - totalSpent);
        const savingsProgress = (projectedSavings / savingsGoal) * 100;

        // Daily Average
        const currentDay = Math.max(1, new Date().getDate());
        const dailyAvg = totalSpent / currentDay;
        const dailyAvgAmountEl = document.getElementById('daily-avg-amount');
        if (dailyAvgAmountEl) dailyAvgAmountEl.textContent = `₹${Math.round(dailyAvg)}`;

        // Top Category
        const categoryData = store.getSpendingByCategory();
        let topCat = null;
        let maxSpend = 0;
        for (const [cat, amount] of Object.entries(categoryData)) {
            if (amount > maxSpend) {
                maxSpend = amount;
                topCat = cat;
            }
        }

        const topCatIconEl = document.getElementById('top-cat-icon');
        const topCatNameEl = document.getElementById('top-cat-name');
        if (topCatNameEl && topCatIconEl) {
            if (topCat) {
                const emojis = { food: '🍔', transportation: '🚗', shopping: '🛍️', bills: '💡', entertainment: '🎬', other: '📝' };
                topCatIconEl.textContent = emojis[topCat] || '📝';
                topCatNameEl.textContent = topCat.charAt(0).toUpperCase() + topCat.slice(1);
            } else {
                topCatIconEl.textContent = '❓';
                topCatNameEl.textContent = '?';
            }
        }

        // Summary Cards updates
        document.querySelector('.summary-card.highlight .amount').textContent = `₹${totalSpent.toFixed(2)}`;

        const predictedAmountEl = document.getElementById('predicted-amount');
        if (predictedAmountEl) {
            predictedAmountEl.textContent = `₹${projectedTotal.toLocaleString()}`;
        }

        document.querySelector('.summary-card:nth-child(3) .amount').textContent = `₹${budget.toFixed(2)}`;
        document.querySelector('.summary-card:nth-child(4) .amount').textContent = `₹${savingsGoal.toFixed(2)}`;

        // Prediction Meter
        const meterFill = document.getElementById('prediction-meter-fill');
        if (meterFill) {
            meterFill.style.width = `${Math.min(projectedPercent, 100)}%`;
            if (projectedTotal > budget) {
                meterFill.style.background = 'var(--error)';
                document.getElementById('prediction-status').textContent = 'Projected to exceed budget!';
            } else {
                meterFill.style.background = 'var(--accent-primary)';
                document.getElementById('prediction-status').textContent = 'On track for month-end';
            }
        }

        // Progress Bars & Sub-texts
        const budgetBar = document.querySelector('.summary-card:nth-child(3) .progress');
        if (budgetBar) {
            budgetBar.style.width = `${Math.min(percentUsed, 100)}%`;
            document.querySelector('.summary-card:nth-child(3) .sub-text').textContent = `${Math.round(percentUsed)}% used`;
        }

        const savingsBar = document.querySelector('.summary-card:nth-child(4) .savings-progress');
        if (savingsBar) {
            savingsBar.style.width = `${Math.min(savingsProgress, 100)}%`;
            document.querySelector('.summary-card:nth-child(4) .sub-text').textContent = `Projected: ₹${projectedSavings.toFixed(2)}`;
        }

        // Emergency Alerts
        const alertsContainer = document.getElementById('dashboard-alerts');
        alertsContainer.innerHTML = '<h3>🚨 Smart Alerts</h3>'; // Reset

        if (percentUsed >= 100) {
            alertsContainer.innerHTML += `
                <div class="alert-item red-alert">
                    <strong>EXCEEDED:</strong> You have exceeded your monthly budget by ₹${(totalSpent - budget).toFixed(2)}. 
                    <br><em>Immediate Action: Categorize remaining essentials only.</em>
                </div>
            `;
        } else if (percentUsed >= 90) {
            alertsContainer.innerHTML += `
                <div class="alert-item red-alert">
                    <strong>CRITICAL:</strong> You've spent ${Math.round(percentUsed)}% of your monthly budget. 
                    <br><em>Recommendation: Initiate an immediate Spending Freeze.</em>
                </div>
            `;
        } else if (percentUsed >= 75) {
            alertsContainer.innerHTML += `
                <div class="alert-item yellow-alert">
                    <strong>Warning:</strong> You've spent ${Math.round(percentUsed)}% of your monthly budget. 
                    Slow down to avoid running out before month-end.
                </div>
            `;
        } else {
            alertsContainer.innerHTML += `
                <div class="alert-item" style="color: var(--success); background: rgba(16, 185, 129, 0.1);">
                    <strong>All Good!</strong> Your spending is on track at ${Math.round(percentUsed)}%.
                </div>
            `;
        }

        // Update Smart Recommendations / Patterns
        const insightsContainer = document.getElementById('smart-insights-container');
        if (insightsContainer) {
            const insights = store.analyzePatterns();
            insightsContainer.innerHTML = '';
            insights.forEach(insight => {
                let bgClass = 'rgba(255,255,255, 0.05)';
                let border = '1px solid var(--glass-border)';
                let color = 'var(--text-primary)';
                if (insight.type === 'warning') {
                    bgClass = 'rgba(245, 158, 11, 0.1)';
                    border = '1px solid rgba(245, 158, 11, 0.3)';
                    color = '#f59e0b';
                }
                insightsContainer.innerHTML += `
                    <div style="background: ${bgClass}; border: ${border}; border-radius: 8px; padding: 10px; width: 100%; display: flex; align-items: flex-start; gap: 10px; animation: fadeIn 0.4s ease;">
                        <span style="font-size: 18px;">${insight.icon}</span>
                        <p style="font-size: 13px; margin: 0; color: ${color}; line-height: 1.4;">${insight.text}</p>
                    </div>
                `;
            });
        }

        // Update Charts
        this.initAllCharts();
    }

    static initAllCharts() {
        if (typeof Chart === 'undefined') {
            setTimeout(() => this.initAllCharts(), 200);
            return;
        }

        // --- Daily Chart (Line, last 7 days) ---
        const dailyData = store.getDailySpendingLast7Days();
        const dailyLabels = Object.keys(dailyData).map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' }));
        const dailyValues = Object.values(dailyData);

        if (window._chartDaily) window._chartDaily.destroy();
        const ctxD = document.getElementById('chart-daily');
        if (ctxD) {
            window._chartDaily = new Chart(ctxD, {
                type: 'line',
                data: {
                    labels: dailyLabels,
                    datasets: [{
                        label: 'Daily Spend (₹)',
                        data: dailyValues,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99,102,241,0.12)',
                        pointBackgroundColor: '#6366f1',
                        pointRadius: 4,
                        tension: 0.4,
                        fill: true,
                    }]
                },
                options: _chartOptions('₹')
            });
        }

        // --- Weekly Chart (Bar, last 4 weeks) ---
        const weeklyData = store.getWeeklySpendingLast4Weeks();
        const weeklyLabels = Object.keys(weeklyData);
        const weeklyValues = Object.values(weeklyData);

        if (window._chartWeekly) window._chartWeekly.destroy();
        const ctxW = document.getElementById('chart-weekly');
        if (ctxW) {
            window._chartWeekly = new Chart(ctxW, {
                type: 'bar',
                data: {
                    labels: weeklyLabels,
                    datasets: [{
                        label: 'Weekly Spend (₹)',
                        data: weeklyValues,
                        backgroundColor: 'rgba(139,92,246,0.7)',
                        borderColor: '#8b5cf6',
                        borderRadius: 6,
                        borderWidth: 1,
                    }]
                },
                options: _chartOptions('₹')
            });
        }

        // --- Monthly Chart (Bar, last 6 months) ---
        const monthlyData = store.getMonthlySpendingLast6Months();
        const monthlyLabels = Object.keys(monthlyData);
        const monthlyValues = Object.values(monthlyData);

        if (window._chartMonthly) window._chartMonthly.destroy();
        const ctxM = document.getElementById('chart-monthly');
        if (ctxM) {
            window._chartMonthly = new Chart(ctxM, {
                type: 'bar',
                data: {
                    labels: monthlyLabels,
                    datasets: [{
                        label: 'Monthly Spend (₹)',
                        data: monthlyValues,
                        backgroundColor: 'rgba(236,72,153,0.7)',
                        borderColor: '#ec4899',
                        borderRadius: 6,
                        borderWidth: 1,
                    }]
                },
                options: _chartOptions('₹')
            });
        }

        // Category doughnut
        CategoryChartManager.update();
    }
}

// Shared chart options helper
function _chartOptions(prefix = '₹') {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.9)',
                padding: 10,
                callbacks: { label: ctx => ' ' + prefix + ctx.parsed.y.toFixed(2) }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(100,116,139,0.1)' },
                ticks: { callback: v => prefix + v }
            },
            x: { grid: { display: false } }
        }
    };
}

class CategoryChartManager {
    static update() {
        const categoryData = store.getSpendingByCategory();
        const labels = Object.keys(categoryData).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1));
        const dataPoints = Object.values(categoryData);

        if (window.categoryChartInstance) {
            window.categoryChartInstance.data.labels = labels;
            window.categoryChartInstance.data.datasets[0].data = dataPoints;
            window.categoryChartInstance.update();
        } else {
            this.initChart(labels, dataPoints);
        }
    }

    static initChart(labels, dataPoints) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        const colors = [
            '#6366f1', // food
            '#8b5cf6', // transportation
            '#ec4899', // shopping
            '#10b981', // bills
            '#f59e0b', // entertainment
            '#64748b'  // other
        ];

        window.categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataPoints,
                    backgroundColor: colors,
                    borderColor: 'rgba(15, 23, 42, 0.5)',
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        padding: 12,
                        callbacks: {
                            label: function (context) { return ' ₹' + context.parsed.toFixed(2); }
                        }
                    }
                }
            }
        });
    }
}

class HistoryManager {
    static render() {
        const list = document.getElementById('transaction-list');
        list.innerHTML = '';

        const expenses = store.getExpenses();

        if (expenses.length === 0) {
            list.innerHTML = `
                <div class="empty-state-container">
                    <img src="empty.png" alt="No Data" class="empty-state-img" />
                    <h3 class="empty-state-title">No expenses found</h3>
                    <p class="empty-state-subtitle">Looks like you haven't logged any transactions yet. Your wallet is full!</p>
                </div>
            `;
            return;
        }

        expenses.forEach(exp => {
            const date = new Date(exp.date);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const emojis = {
                food: '🍔', transportation: '🚗', shopping: '🛍️',
                bills: '💡', entertainment: '🎬', other: '📝'
            };

            const div = document.createElement('div');
            div.className = 'transaction-item';
            div.style.cssText = 'padding: 16px 0; border-bottom: 1px solid var(--glass-border); cursor: pointer;';

            const hasItems = exp.items && exp.items.length > 0;

            div.innerHTML = `
                <div class="transaction-summary" style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="font-size: 24px; background: rgba(255,255,255,0.05); width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">
                            ${emojis[exp.category] || emojis.other}
                        </div>
                        <div>
                            <h4 style="margin-bottom: 4px; font-weight: 500;">${exp.description}</h4>
                            <div style="font-size: 13px; color: var(--text-secondary); text-transform: capitalize;">
                                ${exp.category} • ${formattedDate} ${hasItems ? ` • <span class="badge">📦 ${exp.items.length} items</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-weight: 600; font-size: 16px;">
                            -₹${parseFloat(exp.amount).toFixed(2)}
                        </div>
                        ${hasItems ? '<span class="expand-icon" style="opacity: 0.5;">▼</span>' : ''}
                    </div>
                </div>
                ${hasItems ? `
                <div class="transaction-details" style="display: none; margin-top: 16px; background: rgba(0,0,0,0.1); border-radius: 8px; padding: 12px; animation: slideDown 0.3s ease;">
                    <h5 style="margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--accent-primary);">Receipt Itemization</h5>
                    <div class="items-list" style="display: flex; flex-direction: column; gap: 6px;">
                        ${exp.items.map(item => `
                            <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                <span style="opacity: 0.8;">${item.name}</span>
                                <span style="font-weight: 500;">₹${item.price.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            `;

            if (hasItems) {
                div.addEventListener('click', () => {
                    const details = div.querySelector('.transaction-details');
                    const icon = div.querySelector('.expand-icon');
                    if (details) {
                        const isOpen = details.style.display === 'block';
                        details.style.display = isOpen ? 'none' : 'block';
                        if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                    }
                });
            }
            list.appendChild(div);
        });
    }
}


class ToastManager {
    static show(title, message, icon = '💡', actionLabel = null, actionCallback = null) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';

        let actionHtml = '';
        if (actionLabel && actionCallback) {
            actionHtml = `<button class="toast-action">${actionLabel}</button>`;
        }

        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
            ${actionHtml}
        `;

        if (actionLabel && actionCallback) {
            const actionBtn = toast.querySelector('.toast-action');
            if (actionBtn) {
                actionBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log(`Toast action clicked: ${actionLabel}`);
                    actionCallback();
                    this.remove(toast);
                });
            }
        }

        container.appendChild(toast);

        // Auto remove after 5 seconds if no action, else 8 seconds
        const timeout = actionLabel ? 8000 : 5000;
        setTimeout(() => this.remove(toast), timeout);
    }

    static remove(toast) {
        if (!toast.parentElement) return;
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 500);
    }
}

class FamilyManager {
    static init() {
        const form = document.getElementById('add-family-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('new-member-name');
                const relationInput = document.getElementById('new-member-relation');
                const phoneInput = document.getElementById('new-member-phone');
                if (nameInput && nameInput.value.trim()) {
                    store.addFamilyMember(
                        nameInput.value.trim(),
                        phoneInput ? phoneInput.value.trim() : '',
                        relationInput ? relationInput.value.trim() : ''
                    );
                    nameInput.value = '';
                    if (relationInput) relationInput.value = '';
                    if (phoneInput) phoneInput.value = '';
                    this.update();
                    ToastManager.show('Member Added', 'Family member added successfully!', '🧑‍🤝‍🧑');
                }
            });
        }

        // Toggle split options visibility
        const splitCheckbox = document.getElementById('split-checkbox');
        const splitContainer = document.getElementById('split-members-container');
        if (splitCheckbox && splitContainer) {
            splitCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    splitContainer.style.display = 'block';
                    this.renderSelectionList();
                } else {
                    splitContainer.style.display = 'none';
                }
            });
        }
    }

    static update() {
        this.renderMembers();
        this.renderBalances();
    }

    static renderMembers() {
        const list = document.getElementById('family-members-list');
        if (!list) return;

        const members = store.getFamilyMembers();
        if (members.length === 0) {
            list.innerHTML = '<p style="text-align: center; opacity: 0.5; padding: 20px;">No members added yet.</p>';
            return;
        }

        list.innerHTML = '';
        members.forEach(member => {
            const div = document.createElement('div');
            div.className = 'member-item';
            const relationText = member.relation ? ` (${member.relation})` : '';
            div.innerHTML = `
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 500;">${member.name}${relationText}</span>
                    <span style="font-size: 11px; opacity: 0.6;">${member.phone || 'No phone'}</span>
                </div>
                <button class="btn-delete-member" data-id="${member.id}" title="Remove Member">🗑️</button>
            `;
            list.appendChild(div);
        });

        // Event Delegation for delete buttons
        list.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete-member');
            if (deleteBtn) {
                const id = String(deleteBtn.getAttribute('data-id')).trim();
                console.log('[UI-DEBUG] Delete clicked for ID:', id);
                console.log('[UI-DEBUG] store object status:', typeof store, !!store.deleteFamilyMember);

                try {
                    store.deleteFamilyMember(id);
                    console.log('[UI-DEBUG] store.deleteFamilyMember called successfully');
                    this.update();
                    console.log('[UI-DEBUG] FamilyManager.update called replacement result shown');
                    ToastManager.show('Member Removed', 'Family member has been deleted.', '🗑️');
                } catch (err) {
                    console.error('[UI-DEBUG] Error during delete:', err);
                }
            }
        });
    }

    static renderBalances() {
        const container = document.getElementById('split-balances-container');
        if (!container) return;

        const balances = store.getSplitBalances();
        const activeBalances = Object.entries(balances).filter(([id, data]) => data.amount > 0);

        if (activeBalances.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px 0; opacity: 0.6;">
                    <span style="font-size: 48px;">💸</span>
                    <p>No active splits or balances.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        activeBalances.forEach(([memberId, data]) => {
            const div = document.createElement('div');
            div.className = 'balance-item';
            div.innerHTML = `
                <div>
                    <h4 style="margin-bottom: 4px;">${data.name}</h4>
                    <span class="balance-amount">Owes you ₹${data.amount.toFixed(2)}</span>
                </div>
                <button class="settle-btn" data-member-id="${memberId}">Settle Up</button>
            `;
            container.appendChild(div);
        });

        // Event Delegation for settle buttons
        container.addEventListener('click', (e) => {
            const settleBtn = e.target.closest('.settle-btn');
            if (settleBtn) {
                const memberId = String(settleBtn.getAttribute('data-member-id')).trim();
                const memberData = balances[memberId];
                if (!memberData) {
                    console.error('[UI-DEBUG] Settle clicked but no memberData for ID:', memberId);
                    return;
                }

                console.log('[UI-DEBUG] Settling debts for:', memberData.name, 'ID:', memberId);

                const splits = store.getSplits().filter(s => String(s.memberId) === String(memberId) && s.status === 'unpaid');
                console.log(`[UI-DEBUG] Found ${splits.length} unpaid splits to settle.`);

                try {
                    splits.forEach(s => {
                        console.log('[UI-DEBUG] Calling store.settleSplit for:', s.id);
                        store.settleSplit(s.id);
                    });
                    this.update();
                    console.log('[UI-DEBUG] Settle complete, UI updated');
                    ToastManager.show('Settled Up', `All debts for ${memberData.name} are marked as paid!`, '💰');
                } catch (err) {
                    console.error('[UI-DEBUG] Error during settle:', err);
                }
            }
        });
    }

    static renderSelectionList() {
        const checklist = document.getElementById('family-checklist');
        if (!checklist) return;

        const members = store.getFamilyMembers();
        if (members.length === 0) {
            checklist.innerHTML = '<p style="font-size: 13px; color: var(--text-secondary);">No family members added yet. <a href="#" onclick="window.appRouter.navigate(\'family\'); return false;" style="color: var(--accent-primary); text-decoration: none;">Add members first</a></p>';
            return;
        }

        checklist.innerHTML = '';
        members.forEach(member => {
            const label = document.createElement('label');
            label.className = 'checkbox-container';
            label.innerHTML = `
                <input type="checkbox" name="split-member" value="${member.id}">
                <span class="checkmark"></span>
                ${member.name}
            `;
            checklist.appendChild(label);
        });
    }
}

class AIAssistantManager {
    static init() {
        this.form = document.getElementById('chat-form');
        this.input = document.getElementById('chat-input');
        this.history = document.getElementById('chat-history');

        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = this.input.value.trim();
            if (!message) return;

            this.addMessage(message, 'user-message');
            this.input.value = '';

            this.showTypingIndicator();

            setTimeout(() => {
                this.removeTypingIndicator();
                const response = this.generateResponse(message.toLowerCase());
                this.addMessage(response, 'assistant-message');
            }, 800 + Math.random() * 800); // Simulate thinking 0.8s - 1.6s
        });
    }

    static addMessage(text, className) {
        if (!this.history) return;
        const div = document.createElement('div');
        div.className = `chat-message ${className}`;
        div.innerHTML = `<div class="message-bubble">${text}</div>`;
        this.history.appendChild(div);
        this.scrollToBottom();
    }

    static showTypingIndicator() {
        if (!this.history) return;
        const div = document.createElement('div');
        div.className = `chat-message assistant-message typing-container`;
        div.id = 'typing-indicator-container';
        div.innerHTML = `
            <div class="message-bubble typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>`;
        this.history.appendChild(div);
        this.scrollToBottom();
    }

    static removeTypingIndicator() {
        const typing = document.getElementById('typing-indicator-container');
        if (typing) typing.remove();
    }

    static scrollToBottom() {
        if (this.history) {
            this.history.scrollTop = this.history.scrollHeight;
        }
    }

    static generateResponse(query) {
        if (!store.isLoggedIn()) return "Please log in so I can access your data.";

        // Keywords detection
        if (query.includes('budget') && query.includes('over')) {
            const spent = store.getTotalSpent();
            const budget = store.getBudget();
            if (spent > budget) {
                return `Yes, you are currently over budget by ₹${(spent - budget).toFixed(2)}. Your budget is ₹${budget} and you have spent ₹${spent}. Please review your recent expenses.`;
            } else {
                return `No, you are safe! You have spent ₹${spent.toFixed(2)} out of your ₹${budget} budget. You have ₹${(budget - spent).toFixed(2)} left.`;
            }
        }

        if (query.includes('analyze') || query.includes('report') || query.includes('summary') || query.includes('advice') || query.includes('save') || query.includes('wisely')) {
            const spent = store.getTotalSpent();
            const budget = store.getBudget();
            const left = budget - spent;
            const percent = ((spent / budget) * 100).toFixed(0);

            const categoryData = store.getSpendingByCategory();
            let topCat = 'None';
            let maxSpend = 0;
            for (const [cat, amount] of Object.entries(categoryData)) {
                if (amount > maxSpend) {
                    maxSpend = amount;
                    topCat = cat;
                }
            }

            let advice = "";
            if (spent > budget) {
                advice = "🚨 **Critical:** You have exceeded your budget. Halt non-essential spending!";
            } else if (percent > 80) {
                advice = "⚠️ **Warning:** You've used most of your budget. Slow down to save money.";
            } else {
                advice = "✅ **Good:** You are spending wisely. Keep up the good work to hit your savings goal!";
            }

            return `Here is your full financial report:<br><br>
            • **Budget Setup:** ₹${budget}<br>
            • **Total Spent:** ₹${spent.toFixed(2)} (${percent}% used)<br>
            • **Remaining Balance:** ₹${left > 0 ? left.toFixed(2) : 0}<br>
            • **Top Expense Area:** ${topCat.charAt(0).toUpperCase() + topCat.slice(1)} (₹${maxSpend.toFixed(2)})<br><br>
            ${advice}`;
        }

        if (query.includes('budget')) {
            return `Your current monthly budget is set to ₹${store.getBudget()}. You have spent ₹${store.getTotalSpent().toFixed(2)} so far.`;
        }

        if (query.includes('spent') || query.includes('spending')) {
            const total = store.getTotalSpent();
            return `You have spent exactly ₹${total.toFixed(2)} this month.`;
        }

        if (query.includes('category') || query.includes('categories') || query.includes('top')) {
            const categoryData = store.getSpendingByCategory();
            let topCat = null;
            let maxSpend = 0;
            for (const [cat, amount] of Object.entries(categoryData)) {
                if (amount > maxSpend) {
                    maxSpend = amount;
                    topCat = cat;
                }
            }
            if (!topCat) return "You haven't logged any categorized expenses yet.";
            return `Your highest spending category is **${topCat.charAt(0).toUpperCase() + topCat.slice(1)}** with ₹${maxSpend.toFixed(2)} spent.`;
        }

        if (query.includes('split') || query.includes('owe') || query.includes('balances')) {
            const balances = store.getSplitBalances();
            const activeBalances = Object.entries(balances).filter(([id, data]) => data.amount > 0);
            if (activeBalances.length === 0) return "Nobody owes you money right now. Your splits are settled.";

            let response = "Here's who owes you money:\n";
            activeBalances.forEach(([id, data]) => {
                response += `<br>• ${data.name}: ₹${data.amount.toFixed(2)}`;
            });
            return response;
        }

        if (query.includes('how are you') || query.includes('how do you do')) {
            return `I'm just a few lines of code, but I'm doing great! Thanks for asking, ${store.getUserName()}. Ready to crunch some numbers?`;
        }

        if (query.includes('thank') || query.includes('thanks')) {
            return "You're very welcome! Managing money is hard, I'm just glad I could help.";
        }

        if (query.includes('who are you') || query.includes('your name')) {
            return "I am your SmartTrack AI Financial Assistant! I exist solely to analyze your spending and help you stay on budget.";
        }

        if (query.includes('hello') || query.includes('hi ') || query === 'hi') {
            return `Hello ${store.getUserName()}! How can I help you manage your finances today? Try asking about your budget or top spending categories.`;
        }

        return "I'm not sure how to answer that just yet. I am specialized in analyzing your SmartTrack data. Try asking: 'Am I over budget?', 'What's my top category?', or 'How much have I spent?'";
    }
}

// ========== Voice Input Manager ==========
class VoiceInputManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.parsedData = null;
        this.transcript = '';
        this.supported = false;
        this._initListeners();
    }

    _initListeners() {
        const mic = document.getElementById('mic-btn');
        const apply = document.getElementById('btn-voice-apply');
        const discard = document.getElementById('btn-voice-discard');
        
        if (mic) mic.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("[Voice] Click detected on mic button.");
            this.toggle();
        });
        
        if (apply) apply.addEventListener('click', (e) => { e.preventDefault(); this.applyToForm(); });
        if (discard) discard.addEventListener('click', (e) => { e.preventDefault(); this.discard(); });

        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.supported = !!SR;
        if (!this.supported) {
            console.warn("[Voice] Web Speech API not supported in this browser.");
            const panel = document.getElementById('voice-panel');
            if (panel) {
                panel.innerHTML = `<p style="text-align:center;color:var(--text-secondary);padding:20px 10px;font-size:13px;">
                    🚫 Voice input is not supported on HTTP.<br>
                    Use **HTTPS** or the **Chrome Flags** workaround.
                </p>`;
            }
        }
    }

    _lazyInitRecognition() {
        if (this.recognition || !this.supported) return;
        
        console.log("[Voice] Initializing SpeechRecognition (Lazy)...");
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        try {
            this.recognition = new SR();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-IN';
            
            this.recognition.onstart = () => { console.log("[Voice] onstart firing"); this.isListening = true; this._setUI('listening'); };
            this.recognition.onend = () => { console.log("[Voice] onend firing"); this.isListening = false; this._setUI('idle'); };
            this.recognition.onerror = (e) => {
                console.error("[Voice] recognition.onerror:", e.error);
                this.isListening = false;
                this._setUI('idle');
                ToastManager.show('Voice Error', e.error, '⚠️');
            };
            this.recognition.onresult = (e) => {
                let interim = '', final = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const t = e.results[i][0].transcript;
                    if (e.results[i].isFinal) final += t; else interim += t;
                }
                const display = final || interim;
                this.transcript = display;
                this._showTranscript(display, !final);
                if (final) this._processTranscript(final);
            };
        } catch (err) {
            console.error("[Voice] Recognition creation failed:", err);
            this.supported = false;
        }
    }

    toggle() {
        if (!this.supported) {
            ToastManager.show('Not Supported', 'Speech API denied. Use HTTPS or Chrome flags.', '🚫');
            return;
        }

        // Lazy init on first user tap
        if (!this.recognition) this._lazyInitRecognition();

        if (this.isListening) {
            console.log("[Voice] Manual stop requested.");
            this.recognition.stop();
        } else {
            console.log("[Voice] Manual start requested.");
            this._hideError(); this._hideParsed(); this._hideTranscript();
            try { 
                this.recognition.start(); 
            } catch (err) { 
                console.error("[Voice] Start error:", err);
                this.recognition.stop(); 
                setTimeout(() => this.recognition.start(), 200); 
            }
        }
    }

    // ---- UI helpers ----
    _setUI(state) {
        const btn = document.getElementById('mic-btn');
        const icon = document.getElementById('mic-icon');
        const ring = document.getElementById('mic-pulse-ring');
        const badge = document.getElementById('voice-status-badge');
        const hint = document.getElementById('voice-hint');
        if (!btn) return;

        if (state === 'listening') {
            btn.classList.add('mic-active');
            if (icon) icon.textContent = '⏹️';
            if (ring) ring.classList.add('pulsing');
            if (badge) { badge.textContent = '● Listening…'; badge.className = 'voice-status-badge badge-listening'; }
            if (hint) hint.textContent = 'Speak now… click again to stop';
        } else {
            btn.classList.remove('mic-active');
            if (icon) icon.textContent = '🎤';
            if (ring) ring.classList.remove('pulsing');
            if (badge) { badge.textContent = 'Ready'; badge.className = 'voice-status-badge'; }
            if (hint) hint.textContent = 'Tap to start recording';
        }
    }

    _showTranscript(text, interim = false) {
        const box = document.getElementById('voice-transcript-box');
        const el = document.getElementById('voice-transcript-text');
        if (!box || !el) return;
        box.style.display = 'block';
        el.textContent = text;
        el.style.opacity = interim ? '0.55' : '1';
        el.style.fontStyle = interim ? 'italic' : 'normal';
    }
    _hideTranscript() { const b = document.getElementById('voice-transcript-box'); if (b) b.style.display = 'none'; }
    _hideParsed() { const p = document.getElementById('voice-parsed-preview'); if (p) p.style.display = 'none'; }
    _hideError() { const e = document.getElementById('voice-error'); if (e) e.style.display = 'none'; }
    _showError(msg) {
        const e = document.getElementById('voice-error');
        if (e) { e.innerHTML = '⚠️ ' + msg; e.style.display = 'block'; }
        this._hideParsed();
    }

    // ---- NLP Parser ----
    _processTranscript(text) {
        const parsed = this._parse(text);
        this.parsedData = parsed;
        if (!parsed.amount && !parsed.description) {
            this._showError(`Could not understand "<em>${text}</em>". Try: "Add 200 rupees for food" or "Spent 500 on uber".`);
            return;
        }
        this._showParsed(parsed);
    }

    _parse(text) {
        const lower = text.toLowerCase().trim();
        const result = { amount: null, description: null, category: null };

        // --- Extract amount ---
        const amtPatterns = [
            /\b(\d+(?:\.\d{1,2})?)\s*(?:rupees?|rs\.?|bucks?|₹)\b/i,
            /(?:rupees?|rs\.?|₹|for|of|worth)\s*(\d+(?:\.\d{1,2})?)/i,
            /\b(\d+(?:\.\d{1,2})?)\b/
        ];
        for (const pat of amtPatterns) {
            const m = lower.match(pat);
            if (m) { result.amount = parseFloat(m[1]); break; }
        }

        // --- Extract description ---
        let desc = lower
            .replace(/^(i\s+)?(add(ed)?|spent?|paid?|bought?|log(ged)?|record(ed)?|note(d)?)\s+/i, '')
            .replace(/\b\d+(?:\.\d{1,2})?\s*(?:rupees?|rs\.?|bucks?|₹)?\b/gi, '')
            .replace(/^(for|on|at|to|towards|in)\s+/i, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        if (desc.length > 1) {
            result.description = desc.charAt(0).toUpperCase() + desc.slice(1);
        }

        // --- Auto-categorize ---
        const textForCat = (result.description || text).toLowerCase();
        result.category = autoCategorize(textForCat);
        if (result.category === 'other') result.category = autoCategorize(lower);

        return result;
    }

    _showParsed(parsed) {
        const preview = document.getElementById('voice-parsed-preview');
        const chips = document.getElementById('voice-parsed-chips');
        if (!preview || !chips) return;

        const catEmoji = { food: '🍔', transportation: '🚗', shopping: '🛍️', bills: '💡', entertainment: '🎬', other: '📝' };
        const catLabels = { food: 'Food & Dining', transportation: 'Transportation', shopping: 'Shopping', bills: 'Bills & Utilities', entertainment: 'Entertainment', other: 'Other' };

        chips.innerHTML = '';
        if (parsed.amount) chips.innerHTML += `<div class="parsed-chip chip-amount"><span class="chip-label">Amount</span><span class="chip-value">₹${parsed.amount.toFixed(2)}</span></div>`;
        if (parsed.description) chips.innerHTML += `<div class="parsed-chip chip-desc"><span class="chip-label">Description</span><span class="chip-value">${parsed.description}</span></div>`;
        if (parsed.category) chips.innerHTML += `<div class="parsed-chip chip-cat"><span class="chip-label">Category</span><span class="chip-value">${catEmoji[parsed.category]} ${catLabels[parsed.category]}</span></div>`;

        if (!chips.innerHTML) { this._showError('Could not parse expense details — try a clearer command.'); return; }

        preview.style.display = 'block';
        this._hideError();
    }

    // ---- Form Fill ----
    applyToForm() {
        if (!this.parsedData) return;
        const { amount, description, category } = this.parsedData;
        const amtEl = document.getElementById('amount');
        const descEl = document.getElementById('description');
        const catEl = document.getElementById('category');

        if (amount && amtEl) { amtEl.value = amount; this._flash(amtEl); }
        if (description && descEl) { descEl.value = description; descEl.dispatchEvent(new Event('input')); this._flash(descEl); }
        if (category && catEl) { catEl.value = category; this._flash(catEl); }

        this.discard();
        ToastManager.show('Voice Applied!', 'Form filled — review and hit Add Expense.', '🎙️');
    }

    _flash(el) {
        el.style.transition = 'border-color 0.3s, box-shadow 0.3s';
        el.style.borderColor = 'var(--success)';
        el.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.25)';
        setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 2000);
    }

    discard() {
        this.parsedData = null; this.transcript = '';
        this._hideParsed(); this._hideTranscript(); this._hideError();
    }
}

// ========== Routing System ==========
class Router {
    constructor() {
        this.routes = ['dashboard', 'add-expense', 'scanner', 'history', 'budget', 'family', 'ai-assistant', 'feedback'];
        this.currentRoute = 'dashboard';
        this.navItems = document.querySelectorAll('.nav-links li');
        this.bottomNavItems = document.querySelectorAll('.bottom-nav-item');
        this.views = document.querySelectorAll('.view');
        this.sidebar = document.querySelector('.sidebar');
        this.mobileMenuBtn = document.getElementById('btn-mobile-menu');
        this.overlay = document.getElementById('sidebar-overlay');

        this.init();
    }

    init() {
        // Sidebar Nav items
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const route = item.getAttribute('data-route');
                this.navigate(route);
                this.closeMobileMenu();
            });
        });

        // Bottom Nav items
        this.bottomNavItems.forEach(item => {
            item.addEventListener('click', () => {
                const route = item.getAttribute('data-route');
                this.navigate(route);
            });
        });

        // Mobile Menu Button
        if (this.mobileMenuBtn) {
            this.mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        // Overlay
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }

        this.navigate(this.currentRoute);
    }

    toggleMobileMenu() {
        if (this.sidebar) this.sidebar.classList.toggle('active');
        if (this.mobileMenuBtn) this.mobileMenuBtn.classList.toggle('active');
        if (this.overlay) this.overlay.classList.toggle('active');
    }

    closeMobileMenu() {
        if (this.sidebar) this.sidebar.classList.remove('active');
        if (this.mobileMenuBtn) this.mobileMenuBtn.classList.remove('active');
        if (this.overlay) this.overlay.classList.remove('active');
    }

    navigate(route) {
        if (!this.routes.includes(route)) return;
        this.currentRoute = route;

        this.navItems.forEach(item => {
            if (item.getAttribute('data-route') === route) item.classList.add('active');
            else item.classList.remove('active');
        });

        this.bottomNavItems.forEach(item => {
            if (item.getAttribute('data-route') === route) item.classList.add('active');
            else item.classList.remove('active');
        });

        this.views.forEach(view => {
            if (view.id === `view-${route}`) view.classList.add('active-view');
            else view.classList.remove('active-view');
        });

        const titleMap = {
            'dashboard': 'Dashboard',
            'add-expense': 'Log Expense',
            'scanner': 'Receipt Scanner',
            'history': 'Transaction History',
            'budget': 'Budget Planning',
            'family': 'Family & Splits',
            'ai-assistant': 'AI Assistant',
            'feedback': 'Submit Feedback'
        };
        const userName = store.getUserName();
        const subtitleMap = {
            'dashboard': `Welcome back, ${userName}! Here's your financial overview.`,
            'add-expense': "Record a new transaction. (Auto-categorized!)",
            'scanner': "Scan your physical receipts to auto-extract expenses.",
            'history': "Review your past spending.",
            'budget': "Set limits and track your goals.",
            'family': "Manage shared expenses.",
            'ai-assistant': "Get intelligent financial advice.",
            'feedback': "Help us improve SmartTrack by sharing your thoughts."
        };

        const pageTitleEl = document.getElementById('page-title');
        const pageSubtitleEl = document.getElementById('page-subtitle');
        if (pageTitleEl) pageTitleEl.textContent = titleMap[route];
        if (pageSubtitleEl) pageSubtitleEl.textContent = subtitleMap[route];

        if (route === 'dashboard') DashboardManager.update();
        if (route === 'history') HistoryManager.render();
        if (route === 'family') FamilyManager.update();
        if (route === 'add-expense') {
            const splitCheckbox = document.getElementById('split-checkbox');
            const splitContainer = document.getElementById('split-members-container');
            if (splitCheckbox) splitCheckbox.checked = false;
            if (splitContainer) splitContainer.style.display = 'none';
            FamilyManager.renderSelectionList();
        }
        if (route === 'scanner') {
            // Trigger scanner directly and go back to dashboard or add-expense
            if (window.ScannerManager) {
                window.ScannerManager.openScanner();
                this.navigate('add-expense');
            }
        }
    }
}

// ========== Chart Initialization ==========
window.mainChartInstance = null;
function initDashboardChart(labels, dataPoints, chartType = 'line') {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;

    if (window.mainChartInstance) window.mainChartInstance.destroy();

    if (typeof Chart === 'undefined') {
        setTimeout(() => initDashboardChart(labels, dataPoints, chartType), 100);
        return;
    }

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    const isBar = chartType === 'bar';

    window.mainChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: 'Spending (₹)',
                data: dataPoints,
                borderColor: '#6366f1',
                backgroundColor: isBar
                    ? labels.map((_, i) => `hsla(${239 + i * 12}, 80%, ${60 + i * 4}%, 0.75)`)
                    : 'rgba(99, 102, 241, 0.1)',
                borderWidth: isBar ? 0 : 3,
                borderRadius: isBar ? 8 : 0,
                tension: 0.4,
                fill: !isBar,
                pointBackgroundColor: '#0f172a',
                pointBorderColor: '#6366f1',
                pointBorderWidth: 2,
                pointRadius: isBar ? 0 : 4,
                pointHoverRadius: isBar ? 0 : 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: 'easeInOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function (context) { return '₹' + context.parsed.y.toFixed(2); }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true, grid: { color: 'rgba(100,116,139, 0.1)', drawBorder: false },
                    ticks: { callback: v => '₹' + v }
                },
                x: { grid: { display: false, drawBorder: false } }
            }
        }
    });
}

// ========== Savings Goal Manager ==========
class SavingsGoalManager {
    static async init() {
        this.container = document.getElementById('goals-list-container');
        this.form = document.getElementById('create-goal-form');

        if (this.form) {
            this.form.addEventListener('submit', (e) => this.createGoal(e));
        }
    }

    static async fetchGoals() {
        if (!store || !store.currentUserEmail) return;
        console.log(`[Goals] Fetching for ${store.currentUserEmail}...`);
        try {
            const safeEmail = encodeURIComponent(store.currentUserEmail);
            const res = await fetch(`/api/goals/${safeEmail}`);
            if (res.ok) {
                this.goals = await res.json();
                console.log(`[Goals] Successfully fetched ${this.goals.length} goals.`);
                this.renderGoals();
            } else {
                const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
                console.error("[Goals] Server Error:", err.error);
                ToastManager.show('Goal Sync Error', 'Server returned an error while fetching goals.', '⚠️');
            }
        } catch (e) {
            console.error("[Goals] Fetch Exception:", e);
            ToastManager.show('Connection Error', 'Failed to reach the server for goals. Check your WiFi.', '📶');
        }
    }

    static async createGoal(e) {
        e.preventDefault();
        const nameInput = document.getElementById('goal-name');
        const targetInput = document.getElementById('goal-target');
        const deadlineInput = document.getElementById('goal-deadline');

        try {
            const payload = {
                email: store.currentUserEmail,
                name: nameInput.value,
                targetAmount: parseFloat(targetInput.value),
                deadline: deadlineInput.value || null
            };

            const res = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                ToastManager.show('Goal Created', 'Your new savings goal is active!', '🏆');
                this.form.reset();
                this.fetchGoals();
            }
        } catch (e) {
            ToastManager.show('Error', 'Failed to create goal.', '⚠️');
        }
    }

    static async addFunds(goalId, name) {
        const amountStr = prompt(`How much would you like to add to '${name}'?`);
        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return alert("Invalid amount.");

        try {
            const res = await fetch(`/api/goals/${goalId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addAmount: amount })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.goal && data.goal.status === 'completed') {
                    ToastManager.show('Goal Completed!', `You have reached your goal for '${name}'! 🎉`, '🌟');
                } else {
                    ToastManager.show('Funds Added', `Added ₹${amount} to '${name}'. Keep it up!`, '💰');
                }
                this.fetchGoals();
            }
        } catch (e) {
            ToastManager.show('Error', 'Could not add funds.', '⚠️');
        }
    }

    static renderGoals() {
        if (!this.container) return;
        this.container.innerHTML = '';
        if (!this.goals || this.goals.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px 0; opacity: 0.6;">
                    <span style="font-size: 48px;">🏆</span>
                    <p>No active goals yet. Dream big!</p>
                </div>
            `;
            return;
        }

        const renderGoal = (g) => {
            const progress = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
            const isCompleted = g.status === 'completed';
            const deadlineText = g.deadline ? `Due: ${new Date(g.deadline).toLocaleDateString()}` : 'No deadline';
            return `
                <div class="goal-card ${isCompleted ? 'goal-card-completed' : ''}">
                    <div class="goal-header">
                        <span class="goal-title">${g.name}</span>
                        <span class="goal-deadline">${deadlineText}</span>
                    </div>
                    <div class="goal-stats">
                        <span>₹${g.currentAmount.toLocaleString()} saved</span>
                        <span>₹${g.targetAmount.toLocaleString()} target</span>
                    </div>
                    <div class="goal-progress-wrap">
                        <div class="goal-progress-fill ${isCompleted ? 'completed' : ''}" style="width: ${progress}%;"></div>
                    </div>
                    ${!isCompleted ? `<button class="add-funds-btn" onclick="SavingsGoalManager.addFunds('${g._id}', '${g.name}')">+ Add Funds</button>` : `<div style="text-align: center; color: var(--success); font-size: 13px; font-weight: 600;">Goal Reached! 🎉</div>`}
                </div>
            `;
        };

        this.goals.forEach(g => {
            this.container.innerHTML += renderGoal(g);
        });
    }
}
window.SavingsGoalManager = SavingsGoalManager;

// ========== App Initialization ==========
document.addEventListener('DOMContentLoaded', () => {

    // ========== Dark Mode Toggle ==========
    const DARK_MODE_KEY = 'smart_tracker_dark_mode';

    const applyTheme = (isDark) => {
        const icon = document.getElementById('theme-icon');
        const label = document.getElementById('theme-label');
        const knob = document.getElementById('theme-knob-inner');
        const track = document.getElementById('theme-toggle-knob');

        if (isDark) {
            document.body.classList.add('dark-mode');
            if (icon) icon.textContent = '☀️';
            if (label) label.textContent = 'Light Mode';
            if (knob) knob.style.transform = 'translateX(18px)';
            if (track) track.style.background = '#6366f1';
        } else {
            document.body.classList.remove('dark-mode');
            if (icon) icon.textContent = '🌙';
            if (label) label.textContent = 'Dark Mode';
            if (knob) knob.style.transform = 'translateX(0px)';
            if (track) track.style.background = 'var(--glass-border)';
        }
    };

    // Apply saved preference immediately
    const savedDark = localStorage.getItem(DARK_MODE_KEY) === 'true';
    applyTheme(savedDark);

    // Wire toggle button
    const darkToggleBtn = document.getElementById('btn-dark-mode-toggle');
    if (darkToggleBtn) {
        darkToggleBtn.addEventListener('click', () => {
            const isNowDark = !document.body.classList.contains('dark-mode');
            localStorage.setItem(DARK_MODE_KEY, isNowDark);
            applyTheme(isNowDark);
        });
    }

    // --- Password Visibility Toggle ---
    window.togglePassword = function (inputId, iconElement) {
        const input = document.getElementById(inputId);
        if (!input) return;

        if (input.type === 'password') {
            input.type = 'text';
            iconElement.textContent = '👁️';
        } else {
            input.type = 'password';
            iconElement.textContent = '🙈';
        }
    };

    // --- Password Strength Meter ---
    const regPasswordInput = document.getElementById('reg-password');
    const strengthContainer = document.getElementById('password-strength-container');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    if (regPasswordInput && strengthContainer) {
        regPasswordInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length === 0) {
                strengthContainer.style.display = 'none';
                return;
            }
            strengthContainer.style.display = 'block';

            let strength = 0;
            if (val.length >= 6) strength++;
            if (val.length >= 10) strength++;
            if (/[A-Z]/.test(val)) strength++;
            if (/[a-z]/.test(val)) strength++;
            if (/[0-9]/.test(val)) strength++;
            if (/[^A-Za-z0-9]/.test(val)) strength++;

            let color = '';
            let text = '';
            let width = '0%';

            if (strength <= 2) {
                color = '#ef4444'; // Red (Weak)
                text = 'Weak';
                width = '33%';
            } else if (strength === 3 || strength === 4) {
                color = '#f59e0b'; // Amber (Moderate)
                text = 'Moderate';
                width = '66%';
            } else {
                color = '#10b981'; // Emerald (Strong)
                text = 'Strong';
                width = '100%';
            }

            strengthBar.style.width = width;
            strengthBar.style.backgroundColor = color;
            strengthText.style.color = color;
            strengthText.textContent = text;
        });
    }

    // --- Auth Mode Switching (Global for onclick) ---
    window.switchAuthMode = (mode) => {
        try {
            const loginForm = document.getElementById('login-form');
            const registrationForm = document.getElementById('registration-form');
            const toggleLogin = document.getElementById('toggle-login');
            const toggleRegister = document.getElementById('toggle-register');
            const authSubtitle = document.getElementById('auth-subtitle');

            if (mode === 'login') {
                if (loginForm) loginForm.style.display = 'block';
                if (registrationForm) registrationForm.style.display = 'none';
                if (toggleLogin) toggleLogin.classList.add('active');
                if (toggleRegister) toggleRegister.classList.remove('active');
                if (authSubtitle) authSubtitle.textContent = 'Your personal intelligent finance manager. Please provide your details.';
            } else {
                if (loginForm) loginForm.style.display = 'none';
                if (registrationForm) registrationForm.style.display = 'block';
                if (toggleLogin) toggleLogin.classList.remove('active');
                if (toggleRegister) toggleRegister.classList.add('active');
                if (authSubtitle) authSubtitle.textContent = 'Create a new account to start tracking your expenses independently.';
            }
        } catch (error) {
            console.error('Error switching auth mode:', error);
        }
    };

    // --- Login Cover Flow & Parallax 3D ---
    const loginCover = document.getElementById('login-cover');
    const loginContainer = document.querySelector('.login-container');
    const mainApp = document.getElementById('main-app');
    const registrationForm = document.getElementById('registration-form');
    const loginForm = document.getElementById('login-form'); // Added loginForm

    // 3D Parallax Mouse Effect
    document.addEventListener('mousemove', (e) => {
        if (loginCover.style.display !== 'none') {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 40; // Sensitivity 
            const yAxis = (window.innerHeight / 2 - e.pageY) / 40;
            loginContainer.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        }
    });

    // Reset rotation when tracking leaves
    document.addEventListener('mouseleave', () => {
        if (loginCover.style.display !== 'none') {
            loginContainer.style.transform = `rotateY(0deg) rotateX(0deg)`;
            loginContainer.style.transition = `transform 0.5s ease-out`;
        }
    });

    // Handle Authentication Persistence
    if (store.isLoggedIn()) {
        loginCover.style.display = 'none';
        mainApp.style.display = 'flex';
        initializeApp();
    } else {
        // Default to login view if not logged in
        window.switchAuthMode('login');
    }

    const transitionToApp = () => {
        loginCover.style.opacity = '0';
        setTimeout(() => {
            loginCover.style.display = 'none';
            mainApp.style.display = 'flex';
            mainApp.style.opacity = '0';
            mainApp.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: 'forwards' });
            initializeApp();
            // Refresh profile UI after app is visible
            if (typeof updateProfileUI === 'function') {
                updateProfileUI();
            }
        }, 400);
    };

    // Registration Handler
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const fnameEl = document.getElementById('reg-fname');
                const lnameEl = document.getElementById('reg-lname');
                const emailEl = document.getElementById('reg-email');
                const phoneEl = document.getElementById('reg-phone');
                const passwordEl = document.getElementById('reg-password');
                const confirmPasswordEl = document.getElementById('reg-confirm-password');

                if (!fnameEl || !lnameEl || !emailEl || !phoneEl || !passwordEl || !confirmPasswordEl) {
                    throw new Error("One or more registration fields are missing from the DOM.");
                }

                if (passwordEl.value !== confirmPasswordEl.value) {
                    throw new Error("Passwords do not match!");
                }
                if (passwordEl.value.length < 6) {
                    throw new Error("Password must be at least 6 characters long.");
                }

                const newProfile = {
                    firstName: fnameEl.value.trim(),
                    lastName: lnameEl.value.trim(),
                    email: emailEl.value.trim(),
                    phone: phoneEl.value.trim(),
                    password: passwordEl.value
                };
                await store.register(newProfile);
                ToastManager.show('Account Created', `Welcome aboard, ${newProfile.firstName}!`, '✨');
                transitionToApp();
            } catch (error) {
                console.error("Registration error:", error);
                ToastManager.show('Registration Error', error.message, '⚠️');
            }
        });
    }

    // Login Handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const emailEl = document.getElementById('login-email');
                const passwordEl = document.getElementById('login-password');

                if (!emailEl || !passwordEl) {
                    throw new Error("Login fields are missing from the DOM.");
                }

                const email = emailEl.value.trim();
                const password = passwordEl.value;
                await store.login(email, password);
                ToastManager.show('Welcome Back', `Successfully logged in!`, '🔓');
                transitionToApp();
            } catch (error) {
                console.error("Login error:", error);
                ToastManager.show('Login Failed', error.message, '⚠️');
            }
        });
    }

    // Forgot Password Logic
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const btnCancelReset = document.getElementById('btn-cancel-reset');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (forgotPasswordModal) forgotPasswordModal.classList.add('active');
        });
    }

    if (btnCancelReset) {
        btnCancelReset.addEventListener('click', () => {
            if (forgotPasswordModal) forgotPasswordModal.classList.remove('active');
        });
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reset-email').value.trim();
            const phone = document.getElementById('reset-phone').value.trim();
            const newPassword = document.getElementById('reset-new-password').value.trim();

            const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Resetting...';

            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, phone, newPassword })
                });

                const result = await response.json();

                if (response.ok) {
                    ToastManager.show('Password Reset', 'Your password has been updated. Please login.', '🔐');
                    if (forgotPasswordModal) forgotPasswordModal.classList.remove('active');
                    forgotPasswordForm.reset();
                } else {
                    throw new Error(result.error || 'Failed to reset password.');
                }
            } catch (err) {
                console.error('Reset error:', err);
                ToastManager.show('Reset Failed', err.message, '⚠️');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Reset Password';
            }
        });
    }

    function initializeApp() {
        if (window.appInitialized) return;
        window.appInitialized = true;
        
        console.log("[App] Initializing application components...");
        try {
            window.appRouter = new Router();
        } catch (e) {
            console.error("[App] Router init failed:", e);
        }

        try {
            if (window.FamilyManager) FamilyManager.init();
            if (window.AIAssistantManager) AIAssistantManager.init();
            
            // Re-verify Voice Panel existence before init
            if (document.getElementById('mic-btn')) {
                console.log("[App] Voice Input elements found, initializing...");
                window.voiceInputManager = new VoiceInputManager();
            } else {
                console.warn("[App] Voice Input elements NOT found in DOM.");
            }
            
            if (window.SavingsGoalManager) SavingsGoalManager.fetchGoals();
        } catch (e) {
            console.error("[App] Component manager init failed:", e);
        }

        console.log("[App] Attaching Export Action listeners...");

        // Quick Scan Button Listener
        const quickScanBtn = document.getElementById('quick-scan-btn');
        if (quickScanBtn) {
            console.log("[App] Bound 'Quick Scan' button.");
            quickScanBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("[App] Quick Scan clicked.");
                if (window.ScannerManager) {
                    window.ScannerManager.openScanner();
                }
            });
        }

        // Monthly Report Button Listener
        const monthlyReportBtn = document.getElementById('btn-monthly-report');
        if (monthlyReportBtn) {
            console.log("[App] Bound 'Monthly Report' button.");
            monthlyReportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("[App] Monthly Report clicked.");
                if (window.ExportManager) {
                    ExportManager.downloadMonthlyReport('pdf');
                } else {
                    console.error("[App] ExportManager not found.");
                }
            });
        }

        // Export All Listeners
        const exportExcelBtn = document.getElementById('btn-export-excel');
        if (exportExcelBtn) {
            console.log("[App] Bound 'Export Excel' button.");
            exportExcelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("[App] Export Excel clicked.");
                const expenses = window.store.getExpenses();
                if (expenses.length > 0 && window.ExportManager) {
                    ExportManager.exportToExcel(expenses);
                } else {
                    alert("No expense data available to export.");
                }
            });
        }

        const exportPdfBtn = document.getElementById('btn-export-pdf');
        if (exportPdfBtn) {
            console.log("[App] Bound 'Export PDF' button.");
            exportPdfBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("[App] Export PDF clicked.");
                const expenses = window.store.getExpenses();
                if (expenses.length > 0 && window.ExportManager) {
                    ExportManager.exportToPDF(expenses);
                } else {
                    alert("No expense data available to export.");
                }
            });
        }

        let currentOcrItems = [];

        const renderOcrItems = (thumbnail = null) => {
            const container = document.getElementById('ocr-items-container');
            const list = document.getElementById('ocr-items-list');
            const totalDisplay = document.getElementById('ocr-total-display');
            const imagePreview = document.getElementById('ocr-image-preview');

            if (!container || !list) return;

            if (currentOcrItems.length === 0) {
                container.style.display = 'none';
                return;
            }

            if (thumbnail && imagePreview) {
                imagePreview.innerHTML = `<img src="${thumbnail}" style="width: 100%; height: 100%; object-fit: cover;">`;
            }

            container.style.display = 'block';
            list.innerHTML = '';

            let total = 0;
            currentOcrItems.forEach((item, index) => {
                total += item.price;
                const itemRow = document.createElement('div');
                itemRow.className = 'ocr-item-row edit-mode';
                itemRow.innerHTML = `
                    <div class="ocr-item-info" style="flex: 1;">
                        <input type="text" class="edit-item-name" value="${item.name}" data-index="${index}" style="background: transparent; border: none; color: white; width: 100%; font-size: 13px; font-weight: 500; padding: 2px 4px; border-radius: 4px;">
                        <div style="display: flex; align-items: center; gap: 4px; opacity: 0.7;">
                            <span style="font-size: 11px;">${item.quantity || 1} x ₹</span>
                            <input type="number" step="0.01" class="edit-item-price" value="${item.price.toFixed(2)}" data-index="${index}" style="background: transparent; border: none; color: white; width: 60px; font-size: 11px; padding: 2px;">
                        </div>
                    </div>
                    <button type="button" class="btn-remove-item" data-index="${index}" title="Remove Item">✕</button>
                `;
                list.appendChild(itemRow);
            });

            if (totalDisplay) totalDisplay.textContent = `₹${total.toFixed(2)}`;

            // Add edit listeners
            list.querySelectorAll('.edit-item-name').forEach(input => {
                input.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-index'));
                    currentOcrItems[idx].name = e.target.value;
                });
            });

            list.querySelectorAll('.edit-item-price').forEach(input => {
                input.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-index'));
                    currentOcrItems[idx].price = parseFloat(e.target.value) || 0;

                    // Update main total
                    const newTotal = currentOcrItems.reduce((sum, it) => sum + it.price, 0);
                    if (totalDisplay) totalDisplay.textContent = `₹${newTotal.toFixed(2)}`;
                    const amountInput = document.getElementById('amount');
                    if (amountInput) amountInput.value = newTotal.toFixed(2);
                });
            });

            // Add remove listeners
            list.querySelectorAll('.btn-remove-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-index'));
                    currentOcrItems.splice(idx, 1);
                    renderOcrItems();

                    // Update main amount if it was synced
                    const amountInput = document.getElementById('amount');
                    if (amountInput) {
                        const newTotal = currentOcrItems.reduce((sum, it) => sum + it.price, 0);
                        amountInput.value = newTotal.toFixed(2);
                    }
                });
            });
        };

        // --- Receipt OCR Scanner Initialization ---
        const receiptInput = document.getElementById('receipt-upload');
        const ocrLoader = document.getElementById('ocr-loader');
        const ocrStatus = document.getElementById('ocr-status-text');
        const ocrProgress = document.getElementById('ocr-progress-bar');

        const processOcrFile = async (file, thumbnail = null) => {
            if (!file) return;
            try {
                // Show Loader
                if (ocrLoader) ocrLoader.style.display = 'block';
                if (ocrStatus) ocrStatus.textContent = 'Analyzing Receipt...';

                const result = await OCRManager.processReceipt(file, (status, progress) => {
                    if (ocrStatus) ocrStatus.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)}...`;
                    if (ocrProgress) ocrProgress.style.width = `${progress}%`;
                });

                // Fill Form
                const amountInput = document.getElementById('amount');
                const descInput = document.getElementById('description');
                const dateInput = document.getElementById('date');

                if (result.amount && amountInput) {
                    amountInput.value = result.amount;
                    amountInput.classList.add('highlight-flash');
                }
                if (result.description && descInput) {
                    descInput.value = result.description;
                    descInput.classList.add('highlight-flash');
                }
                if (result.date && dateInput) {
                    dateInput.value = result.date;
                    dateInput.classList.add('highlight-flash');
                }

                // Handle Items
                if (result.items && result.items.length > 0) {
                    currentOcrItems = result.items;
                    renderOcrItems(thumbnail);
                }

                ToastManager.show('Receipt Scanned', 'Form auto-filled with receipt data.', '📄');

                // Simple animation cleanup
                setTimeout(() => {
                    if (amountInput) amountInput.classList.remove('highlight-flash');
                    if (descInput) descInput.classList.remove('highlight-flash');
                    if (dateInput) dateInput.classList.remove('highlight-flash');
                }, 2000);

            } catch (err) {
                console.error('OCR Process failed:', err);
                ToastManager.show('Scan Failed', 'Could not read receipt correctly.', '⚠️');
            } finally {
                if (ocrLoader) ocrLoader.style.display = 'none';
                if (ocrProgress) ocrProgress.style.width = '0%';
                if (receiptInput) receiptInput.value = ''; // Reset
            }
        };

        if (receiptInput) {
            receiptInput.addEventListener('change', (e) => processOcrFile(e.target.files[0]));
        }

        // Live Scanner Capture Integration
        if (window.ScannerManager) {
            window.ScannerManager.onCapture((blob, thumbnail) => {
                const file = new File([blob], "captured-receipt.jpg", { type: "image/jpeg" });
                processOcrFile(file, thumbnail);
            });
        }

        // --- PWA Service Worker & Network Sync ---
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Service Worker registered', reg))
                .catch(err => console.error('Service Worker registration failed', err));
        }

        window.addEventListener('online', () => {
            ToastManager.show('Back Online', 'Internet restored. Syncing data...', '🌐');
            store.attemptSync().then(() => {
                ToastManager.show('Sync Complete', 'Data synced successfully', '✅');
            });
        });

        window.addEventListener('offline', () => {
            ToastManager.show('Offline Mode', 'Offline mode active. Your data is saved locally.', '📶');
        });

        // Trigger sync immediately on startup if online
        store.attemptSync();

        // --- User Profile & Logout Initialization ---
        const updateProfileUI = () => {
            const name = store.getUserName();
            const initial = name ? name.charAt(0).toUpperCase() : 'U';
            document.getElementById('user-avatar-text').textContent = initial;
            if (window.appRouter.currentRoute === 'dashboard') {
                const subtitle = document.getElementById('page-subtitle');
                if (subtitle) {
                    subtitle.textContent = `Welcome back, ${name}! Here's your financial overview.`;
                }
            }
        };

        updateProfileUI();

        // Logout Listener
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                ToastManager.show(
                    'Confirm Logout',
                    'Are you sure you want to log out?',
                    '🚪',
                    'Confirm',
                    () => {
                        store.logout();
                        // Manual Reset of UI
                        const mainApp = document.getElementById('main-app');
                        const loginCover = document.getElementById('login-cover');

                        mainApp.style.opacity = '0';
                        setTimeout(() => {
                            mainApp.style.display = 'none';
                            loginCover.style.display = 'flex';
                            loginCover.style.opacity = '1';
                            window.switchAuthMode('login');
                        }, 400);
                    }
                );
            });
        }

        // Profile Click Listeners
        const profileBtn = document.getElementById('profile-btn');
        const profileModal = document.getElementById('profile-modal');
        const fnameInput = document.getElementById('profile-fname');
        const lnameInput = document.getElementById('profile-lname');
        const emailInput = document.getElementById('profile-email');
        const phoneInput = document.getElementById('profile-phone');

        const saveProfileBtn = document.getElementById('btn-save-profile');
        const cancelProfileBtn = document.getElementById('btn-cancel-profile');

        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                const currentProfile = store.getProfile();
                if (currentProfile) {
                    if (fnameInput) fnameInput.value = currentProfile.firstName;
                    if (lnameInput) lnameInput.value = currentProfile.lastName;
                    if (emailInput) emailInput.value = currentProfile.email;
                    if (phoneInput) phoneInput.value = currentProfile.phone;
                }
                if (profileModal) profileModal.classList.add('active');
            });
        }

        if (cancelProfileBtn) {
            cancelProfileBtn.addEventListener('click', () => {
                if (profileModal) profileModal.classList.remove('active');
            });
        }

        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                if (fnameInput && lnameInput && fnameInput.value.trim() && lnameInput.value.trim()) {
                    const currentProfile = store.getProfile();
                    store.updateProfile({
                        ...currentProfile,
                        firstName: fnameInput.value.trim(),
                        lastName: lnameInput.value.trim(),
                        phone: phoneInput ? phoneInput.value.trim() : ''
                    });
                    updateProfileUI();
                    if (profileModal) profileModal.classList.remove('active');
                } else {
                    alert("First Name and Last Name are required.");
                }
            });
        }

        // Auto-categorize preview logic
        const descInput = document.getElementById('description');
        const catSelect = document.getElementById('category');

        if (descInput && catSelect) {
            descInput.addEventListener('input', (e) => {
                const desc = e.target.value;
                if (desc.length > 2) {
                    const predictedCategory = autoCategorize(desc);
                    catSelect.value = predictedCategory;
                    catSelect.style.borderColor = 'var(--success)';
                    setTimeout(() => catSelect.style.borderColor = 'var(--glass-border)', 1500);
                }
            });
        }

        // Expense Form submission
        const expenseForm = document.getElementById('expense-form');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    const amountEl = document.getElementById('amount');
                    const descEl = document.getElementById('description');
                    const catEl = document.getElementById('category');

                    if (!amountEl || !descEl || !catEl) throw new Error("Missing expense inputs");

                    const amount = amountEl.value;
                    const description = descEl.value;
                    const category = catEl.value;

                    const isSplit = document.getElementById('split-checkbox').checked;
                    let splitWith = [];
                    if (isSplit) {
                        const checkedMembers = document.querySelectorAll('input[name="split-member"]:checked');
                        splitWith = Array.from(checkedMembers).map(cb => cb.value);
                    }

                    store.addExpense({
                        amount: parseFloat(amount),
                        description: description,
                        category: category,
                        date: document.getElementById('date').value || new Date().toISOString(),
                        isSplit: isSplit,
                        splitWith: splitWith,
                        items: currentOcrItems
                    });

                    currentOcrItems = [];
                    renderOcrItems();

                    ToastManager.show(
                        'Expense Added',
                        `Successfully logged ₹${amount} for ${description}`,
                        '✅'
                    );

                    expenseForm.reset();
                    if (window.appRouter) window.appRouter.navigate('dashboard');
                } catch (err) {
                    console.error('Error adding expense:', err);
                    ToastManager.show('Error', 'Failed to add expense.', '⚠️');
                }
            });
        }

        // Clear OCR Items
        const btnClearOcr = document.getElementById('btn-clear-ocr');
        if (btnClearOcr) {
            btnClearOcr.addEventListener('click', () => {
                currentOcrItems = [];
                renderOcrItems();
            });
        }

        // Budget Form Setup
        const budgetForm = document.getElementById('budget-form');
        const budgetInput = document.getElementById('monthly-budget');

        // Pre-fill existing data safely
        if (budgetInput) budgetInput.value = store.getBudget();

        if (budgetForm) {
            budgetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                try {
                    if (!budgetInput) throw new Error("Missing budget inputs");
                    const budgetAmount = parseFloat(budgetInput.value);

                    store.updateBudget(budgetAmount);

                    ToastManager.show(
                        'Budget Updated',
                        'Your monthly budget limit has been saved.',
                        '🎯'
                    );
                    if (window.appRouter) window.appRouter.navigate('dashboard');
                } catch (error) {
                    console.error("Budget update error:", error);
                    ToastManager.show('Update Failed', error.message, '⚠️');
                }
            });
        }
        // --- Chart Period Tab Switcher ---
        const chartTabsContainer = document.getElementById('chart-tabs');
        if (chartTabsContainer) {
            chartTabsContainer.addEventListener('click', (e) => {
                const tab = e.target.closest('.chart-tab');
                if (!tab) return;
                const period = tab.getAttribute('data-period');
                // Update active state
                chartTabsContainer.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // Re-render chart for selected period
                DashboardManager.updateCharts(period);
            });
        }

        // 3D Feedback Card Animations

        const feedbackCard = document.querySelector('#view-feedback .glass-panel');
        if (feedbackCard) {
            feedbackCard.addEventListener('mousemove', (e) => {
                const rect = feedbackCard.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -8;
                const rotateY = ((x - centerX) / centerX) * 8;

                feedbackCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                feedbackCard.style.transition = 'none';
            });

            feedbackCard.addEventListener('mouseleave', () => {
                feedbackCard.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
                feedbackCard.style.transition = 'transform 0.5s ease-out';
            });
        }

        // Feedback Form Setup
        const feedbackForm = document.getElementById('feedback-form');
        if (feedbackForm) {
            feedbackForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    const nameEl = document.getElementById('fb-name');
                    const emailEl = document.getElementById('fb-email');
                    const ratingEl = document.getElementById('fb-rating');
                    const commentsEl = document.getElementById('fb-comments');

                    if (!nameEl || !emailEl || !ratingEl || !commentsEl) throw new Error("Missing feedback inputs");

                    const submitBtn = feedbackForm.querySelector('button[type="submit"]');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Submitting...';

                    const payload = {
                        name: nameEl.value.trim(),
                        email: emailEl.value.trim(),
                        rating: parseInt(ratingEl.value),
                        comments: commentsEl.value.trim()
                    };

                    const response = await fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error('Server returned an error.');
                    }

                    ToastManager.show(
                        'Feedback Submitted',
                        'Thank you for your valuable feedback!',
                        '💖'
                    );

                    feedbackForm.reset();
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Feedback';

                    if (feedbackCard) {
                        feedbackCard.style.transition = 'transform 0.8s cubic-bezier(0.68, -0.55, 0.26, 1.55)';
                        feedbackCard.style.transform = 'perspective(1000px) rotateX(360deg)';
                        setTimeout(() => {
                            feedbackCard.style.transform = 'perspective(1000px) rotateX(0deg)';
                            if (window.appRouter) window.appRouter.navigate('dashboard');
                        }, 800);
                    } else {
                        if (window.appRouter) window.appRouter.navigate('dashboard');
                    }
                } catch (err) {
                    console.error('Error submitting feedback:', err);
                    ToastManager.show('Error', 'Failed to submit feedback. Is the server running?', '⚠️');
                    const submitBtn = feedbackForm.querySelector('button[type="submit"]');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Submit Feedback';
                    }
                }
            });
        }

        // --- Advanced Features: Notifications & Exit Prompt ---

        // Smart Daily Notification
        const lastCheckIn = localStorage.getItem('smart_tracker_last_checkin');
        const todayStr = new Date().toDateString();

        if (lastCheckIn !== todayStr) {
            setTimeout(() => {
                ToastManager.show(
                    'Daily Finance Check',
                    'Did you spend any money today? Log it now to stay on track!',
                    '✨',
                    'Log Expense',
                    () => window.appRouter.navigate('add-expense')
                );
                localStorage.setItem('smart_tracker_last_checkin', todayStr);
            }, 2000);
        }

        // Exit Feedback Prompt
        let expensesLoggedThisSession = 0;
        const observer = new MutationObserver(() => {
            expensesLoggedThisSession = store.getExpenses().length; // Tracking length changes loosely
        });
        observer.observe(document.getElementById('transaction-list'), { childList: true });

        // Removed aggressive beforeunload prompt to improve UX and prevent reload interference
        /*
        window.addEventListener('beforeunload', (event) => {
            event.returnValue = 'Are you sure you want to leave? Please ensure you have logged all your expenses today!';
        });
        */
        
        console.log("[App] Initialization Complete.");
    }
});
// app_new.js - End of file
