class Store {
    constructor() {
        this.STORAGE_KEY = 'smart_expense_tracker_db';
        this.db = this.loadDatabase();
        this.currentUserEmail = localStorage.getItem('smart_tracker_session');
    }

    // Default structure for a new user account
    getNewUserAccount(profile) {
        const today = new Date();
        return {
            profile: profile,
            expenses: [],
            familyMembers: [],
            splits: [],
            budget: 5000,
            savingsGoal: 1000,
            categories: ['food', 'transportation', 'shopping', 'bills', 'entertainment', 'other'],
            feedbacks: []
        };
    }

    loadDatabase() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }

            // Handle Migration from old single-user system
            const oldKey = 'smart_expense_tracker_state';
            const oldData = localStorage.getItem(oldKey);
            if (oldData) {
                const parsed = JSON.parse(oldData);
                if (parsed.profile && parsed.profile.email) {
                    const db = { [parsed.profile.email]: parsed };
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(db));
                    return db;
                }
            }
        } catch (error) {
            console.error('Failed to parse database from localStorage. Corrupted data found.', error);
            // Optionally clear data if totally unrecoverable: localStorage.removeItem(this.STORAGE_KEY);
        }

        return {}; // Empty database
    }

    saveDatabase() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.db));
    }

    // --- Auth Methods ---

    async register(profile) {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Registration failed.');
            }

            // Initialize local db structure if not exists
            if (!this.db[profile.email]) {
                this.db[profile.email] = this.getNewUserAccount(data.user);
                this.saveDatabase();
            }

            return await this.login(profile.email, profile.password);
        } catch (error) {
            throw error;
        }
    }

    async login(email, password) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed.');
            }

            // Sync with local DB structure
            if (!this.db[email]) {
                this.db[email] = this.getNewUserAccount(data.user);
            } else {
                // Update profile with fresh data from server
                this.db[email].profile = data.user;
            }

            this.currentUserEmail = email;
            localStorage.setItem('smart_tracker_session', email);

            // Fetch existing data from server to populate local store
            await this.fetchUserData(email);

            return this.db[email];
        } catch (error) {
            throw error;
        }
    }

    async fetchUserData(email) {
        try {
            console.log(`[Store] Fetching all server data for ${email}...`);
            const [expensesRes, goalsRes] = await Promise.all([
                fetch(`/api/expenses/${encodeURIComponent(email)}`),
                fetch(`/api/goals/${encodeURIComponent(email)}`)
            ]);

            if (expensesRes.ok) {
                const expenses = await expensesRes.json();
                this.db[email].expenses = expenses;
                console.log(`[Store] Synced ${expenses.length} expenses.`);
            }

            if (goalsRes.ok) {
                const goals = await goalsRes.json();
                this.db[email].goals = goals; // Ensure this is stored if goals use app state
            }

            this.saveDatabase();
        } catch (e) {
            console.error("[Store] Failed to fetch user data for sync:", e);
        }
    }

    logout() {
        this.currentUserEmail = null;
        localStorage.removeItem('smart_tracker_session');
    }

    isLoggedIn() {
        return !!this.currentUserEmail && !!this.db[this.currentUserEmail];
    }

    get state() {
        if (!this.currentUserEmail) return null;
        return this.db[this.currentUserEmail];
    }

    // --- Action Methods ---

    addExpense(expense) {
        if (!this.state) return;
        const newExpense = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            ...expense
        };
        this.state.expenses.unshift(newExpense);

        // Handle Splits
        if (expense.isSplit && expense.splitWith && expense.splitWith.length > 0) {
            const splitAmount = parseFloat(expense.amount) / (expense.splitWith.length + 0); // was +1 but wait
            expense.splitWith.forEach(memberId => {
                if (!this.state.splits) this.state.splits = [];
                this.state.splits.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    expenseId: newExpense.id,
                    memberId: memberId,
                    amount: splitAmount,
                    date: new Date().toISOString(),
                    status: 'unpaid'
                });
            });
        }

        this.saveDatabase();
        this.queueSync('ADD_EXPENSE', newExpense);
        return newExpense;
    }

    // --- Offline Sync Engine ---
    queueSync(action, payload) {
        if (!this.currentUserEmail) return;
        let queue = JSON.parse(localStorage.getItem('smart_tracker_sync_queue')) || [];
        queue.push({ action, payload, email: this.currentUserEmail, timestamp: Date.now() });
        localStorage.setItem('smart_tracker_sync_queue', JSON.stringify(queue));
        this.attemptSync();
    }

    async attemptSync() {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return; // Offline

        let queue = JSON.parse(localStorage.getItem('smart_tracker_sync_queue')) || [];
        if (queue.length === 0) return;

        // Group by user email or just use the current user
        if (!this.currentUserEmail) return;
        const myQueue = queue.filter(q => q.email === this.currentUserEmail);
        if (myQueue.length === 0) return;

        const expensesToSync = myQueue.filter(q => q.action === 'ADD_EXPENSE').map(q => q.payload);

        if (expensesToSync.length > 0) {
            try {
                const res = await fetch('/api/expenses/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this.currentUserEmail, expenses: expensesToSync })
                });

                if (res.ok) {
                    // Remove synced items from queue
                    const remainingQueue = queue.filter(q => !(q.email === this.currentUserEmail && q.action === 'ADD_EXPENSE'));
                    localStorage.setItem('smart_tracker_sync_queue', JSON.stringify(remainingQueue));
                    console.log(`[Sync Engine] Synced ${expensesToSync.length} expenses to cloud.`);
                }
            } catch (e) {
                console.warn('[Sync Engine] Sync failed, keeping in queue', e);
            }
        }
    }

    deleteExpense(id) {
        if (!this.state) return;
        this.state.expenses = this.state.expenses.filter(e => e.id !== id);
        this.saveDatabase();
    }

    updateBudget(amount) {
        if (!this.state) return;
        this.state.budget = amount;
        this.saveDatabase();
    }

    updateSavingsGoal(amount) {
        if (!this.state) return;
        this.state.savingsGoal = amount;
        this.saveDatabase();
    }

    updateProfile(profileData) {
        if (!this.state) return;
        this.state.profile = { ...this.state.profile, ...profileData };
        this.saveDatabase();
    }

    // --- Getter Methods ---

    getExpenses() {
        return this.state ? this.state.expenses : [];
    }

    getTotalSpent() {
        return this.getExpenses().reduce((sum, e) => {
            const amt = parseFloat(e.amount);
            return sum + (isNaN(amt) ? 0 : amt);
        }, 0);
    }

    getBudget() {
        return this.state ? this.state.budget : 5000;
    }

    getSavingsGoal() {
        return this.state ? (this.state.savingsGoal || 500) : 500;
    }

    // --- Feedback Methods ---

    addFeedback(feedback) {
        if (!this.state) return;
        if (!this.state.feedbacks) this.state.feedbacks = [];
        this.state.feedbacks.push({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            ...feedback
        });
        this.saveDatabase();
    }

    getFeedback() {
        if (!this.state) return [];
        return this.state.feedbacks || [];
    }

    getProfile() {
        return this.state ? this.state.profile : null;
    }

    getUserName() {
        return this.getProfile() ? this.getProfile().firstName : 'User';
    }

    getDailySpendingLast7Days() {
        const data = {};
        const today = new Date();
        const expenses = this.getExpenses();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            data[d.toISOString().split('T')[0]] = 0;
        }

        expenses.forEach(e => {
            const dateStr = e.date.split('T')[0];
            if (data[dateStr] !== undefined) {
                const amt = parseFloat(e.amount);
                data[dateStr] += isNaN(amt) ? 0 : amt;
            }
        });

        return data;
    }

    getWeeklySpendingLast4Weeks() {
        const data = {};
        const today = new Date();
        const expenses = this.getExpenses();

        // Build 4-week buckets (most-recent week last)
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(today);
            // Align to Monday of the current week first
            const dayOfWeek = today.getDay(); // 0=Sun,1=Mon,...
            const daysToMonday = (dayOfWeek + 6) % 7; // days since last Monday
            weekStart.setDate(today.getDate() - daysToMonday - i * 7);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                + ' - '
                + weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            data[label] = { total: 0, start: weekStart, end: weekEnd };
        }

        expenses.forEach(e => {
            const d = new Date(e.date);
            for (const [label, bucket] of Object.entries(data)) {
                if (d >= bucket.start && d <= bucket.end) {
                    const amt = parseFloat(e.amount);
                    bucket.total += isNaN(amt) ? 0 : amt;
                    break;
                }
            }
        });

        // Return simplified { label: total } map
        const result = {};
        for (const [label, bucket] of Object.entries(data)) {
            result[label] = bucket.total;
        }
        return result;
    }

    getMonthlySpendingLast6Months() {
        const data = {};
        const today = new Date();
        const expenses = this.getExpenses();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            data[label] = { total: 0, year: d.getFullYear(), month: d.getMonth() };
        }

        expenses.forEach(e => {
            const d = new Date(e.date);
            const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (data[label] !== undefined) {
                const amt = parseFloat(e.amount);
                data[label].total += isNaN(amt) ? 0 : amt;
            }
        });

        const result = {};
        for (const [label, bucket] of Object.entries(data)) {
            result[label] = bucket.total;
        }
        return result;
    }

    getSpendingByCategory() {
        const data = {};
        if (!this.state) return data;

        this.state.categories.forEach(cat => data[cat] = 0);

        this.getExpenses().forEach(e => {
            if (data[e.category] !== undefined) {
                data[e.category] += parseFloat(e.amount);
            } else {
                data['other'] = (data['other'] || 0) + parseFloat(e.amount);
            }
        });
        return data;
    }

    // --- Family & Splits Methods ---

    addFamilyMember(name, phone = '', relation = '') {
        if (!this.state) return;
        if (!this.state.familyMembers) this.state.familyMembers = [];
        const newMember = {
            id: Date.now().toString(),
            name: name,
            phone: phone,
            relation: relation
        };
        this.state.familyMembers.push(newMember);
        this.saveDatabase();
        return newMember;
    }

    deleteFamilyMember(id) {
        if (!this.currentUserEmail || !this.db[this.currentUserEmail]) {
            console.error('[Store-ULTIMATE] FAILED: No user session found during delete.');
            return;
        }
        const userState = this.db[this.currentUserEmail];
        if (!userState.familyMembers) userState.familyMembers = [];

        console.log('[Store-ULTIMATE] Attempting to delete member ID:', id);
        const index = userState.familyMembers.findIndex(m => String(m.id) === String(id));

        if (index > -1) {
            console.log('[Store-ULTIMATE] Found member at index:', index, '. Splicing...');
            userState.familyMembers.splice(index, 1);
            this.saveDatabase();
        } else {
            console.warn('[Store-ULTIMATE] Member ID NOT found in family list:', id);
        }
    }

    getFamilyMembers() {
        if (!this.state) return [];
        return this.state.familyMembers || [];
    }

    getSplits() {
        if (!this.state) return [];
        return this.state.splits || [];
    }

    settleSplit(splitId) {
        if (!this.currentUserEmail || !this.db[this.currentUserEmail]) {
            console.error('[Store-ULTIMATE] FAILED: No user session found during settle.');
            return;
        }
        const userState = this.db[this.currentUserEmail];
        if (!userState.splits) return;

        console.log('[Store-ULTIMATE] Attempting to settle split:', splitId);
        const split = userState.splits.find(s => String(s.id) === String(splitId));
        if (split) {
            console.log('[Store-ULTIMATE] Found split, setting to paid.');
            split.status = 'paid';
            this.saveDatabase();
        } else {
            console.warn('[Store-ULTIMATE] Split ID NOT found:', splitId);
        }
    }

    getSplitBalances() {
        if (!this.state) return {};
        const members = this.getFamilyMembers();
        const splits = this.getSplits();

        const balances = {};
        members.forEach(m => balances[m.id] = { name: m.name, amount: 0 });

        splits.forEach(s => {
            if (s.status === 'unpaid' && balances[s.memberId]) {
                balances[s.memberId].amount += s.amount;
            }
        });

        return balances;
    }

    getProjectedMonthlySpending() {
        const expenses = this.getExpenses();
        if (expenses.length === 0) return 0;

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const dayOfMonth = today.getDate();

        const totalSpentThisMonth = expenses.reduce((sum, e) => {
            const expenseDate = new Date(e.date);
            if (expenseDate >= firstDayOfMonth) {
                return sum + parseFloat(e.amount);
            }
            return sum;
        }, 0);

        if (dayOfMonth === 0) return totalSpentThisMonth;

        const dailyAverage = totalSpentThisMonth / dayOfMonth;
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        return Math.round(dailyAverage * daysInMonth);
    }

    // --- Pattern Detection ---
    analyzePatterns() {
        const expenses = this.getExpenses();
        const insights = [];
        if (expenses.length < 3) {
            insights.push({ icon: '🎓', text: 'Keep logging expenses so I can learn your spending patterns!', type: 'info' });
            return insights;
        }

        // 1. Detect weekend vs weekday spending
        let weekendTotal = 0, weekdayTotal = 0;
        let weekendDaysLogged = new Set();
        let weekdayDaysLogged = new Set();
        let weekendCategories = {};

        // 2. Detect recurring descriptions
        const descGroups = {};

        expenses.forEach(e => {
            const d = new Date(e.date);
            const amt = parseFloat(e.amount);
            const dateStr = d.toISOString().split('T')[0];
            const dayOfWeek = d.getDay();
            const dayOfMonth = d.getDate();
            const desc = e.description.toLowerCase().trim();

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                weekendTotal += amt;
                weekendDaysLogged.add(dateStr);
                weekendCategories[e.category] = (weekendCategories[e.category] || 0) + amt;
            } else {
                weekdayTotal += amt;
                weekdayDaysLogged.add(dateStr);
            }

            if (!descGroups[desc]) descGroups[desc] = { count: 0, days: [], amounts: [] };
            descGroups[desc].count++;
            descGroups[desc].days.push(dayOfMonth);
            descGroups[desc].amounts.push(amt);
        });

        const avgWeekend = weekendDaysLogged.size > 0 ? weekendTotal / weekendDaysLogged.size : 0;
        const avgWeekday = weekdayDaysLogged.size > 0 ? weekdayTotal / weekdayDaysLogged.size : 0;

        if (avgWeekend > avgWeekday * 1.5 && weekendDaysLogged.size > 1) {
            let topWeekendCat = Object.keys(weekendCategories).reduce((a, b) => weekendCategories[a] > weekendCategories[b] ? a : b, '');
            insights.push({
                icon: '🎉',
                text: `You spend significantly more during weekends, mostly on ${topWeekendCat}!`,
                type: 'warning'
            });
        } else if (avgWeekday > avgWeekend * 1.5 && weekdayDaysLogged.size > 1) {
            insights.push({
                icon: '💼',
                text: `Your weekday spending is much higher than weekends. Keep an eye on it.`,
                type: 'info'
            });
        }

        for (const [desc, data] of Object.entries(descGroups)) {
            if (data.count >= 2) {
                if (['uber', 'food', 'lunch', 'groceries', 'dinner', 'breakfast', 'taxi'].includes(desc)) continue;

                const avgDay = data.days.reduce((a, b) => a + b, 0) / data.count;
                const variance = data.days.reduce((a, b) => a + Math.pow(b - avgDay, 2), 0) / data.count;

                if (variance <= 3) {
                    const suffix = (day) => {
                        if (day > 3 && day < 21) return 'th';
                        switch (day % 10) {
                            case 1: return "st";
                            case 2: return "nd";
                            case 3: return "rd";
                            default: return "th";
                        }
                    };
                    const dateStr = `${Math.round(avgDay)}${suffix(Math.round(avgDay))}`;
                    insights.push({
                        icon: '🔄',
                        text: `You usually pay for '${desc}' around the ${dateStr} of the month.`,
                        type: 'info'
                    });
                }
            }
        }

        if (insights.length === 0) {
            insights.push({ icon: '🔍', text: "Analyzing your data. More insights will appear as you log.", type: 'info' });
        }

        return insights;
    }
}
// 👉 other functions...

// ✅ ADD HERE (top or bottom)

// 👉 existing code continues.

// Global Singleton Instance
window.store = new Store();
