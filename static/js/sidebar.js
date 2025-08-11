// Sidebar Navigation Management
class SidebarNavigation {
    constructor() {
        this.currentSection = 'dashboard';
        this.sidebar = document.getElementById('sidebar');
        this.sidebarToggle = document.getElementById('sidebarToggle');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.navItems = document.querySelectorAll('.nav-item');
        this.sections = document.querySelectorAll('.dashboard-section');
        
        this.init();
    }
    
    init() {
        // Set up navigation event listeners
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });
        
        // Set up sidebar toggle
        if (this.sidebarToggle) {
            this.sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
        
        // Set up overlay click to close sidebar
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }
        
        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.sidebar.contains(e.target) && 
                !this.sidebarToggle.contains(e.target) &&
                this.sidebar.classList.contains('expanded')) {
                this.closeSidebar();
            }
        });
        
        // Initialize with dashboard section
        this.navigateToSection('dashboard');
    }
    
    navigateToSection(sectionName) {
        // Update active navigation item
        this.navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-section') === sectionName) {
                item.classList.add('active');
            }
        });
        
        // Show/hide sections
        this.sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === `${sectionName}-section`) {
                section.classList.add('active');
            }
        });
        
        this.currentSection = sectionName;
        
        // Close sidebar after navigation
        this.closeSidebar();
        
        // Trigger section-specific initialization
        this.initializeSection(sectionName);
    }
    
    initializeSection(sectionName) {
        // Call appropriate initialization functions based on section
        switch(sectionName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'accounts':
                this.loadAccountsData();
                break;
            case 'transactions':
                this.loadTransactionsData();
                break;
            case 'bills':
                this.loadBillsData();
                break;
            case 'categories':
                this.loadCategoriesData();
                break;
            case 'savings-goals':
                this.loadSavingsGoalsData();
                break;
            case 'account-settings':
                this.loadAccountSettingsData();
                break;
        }
    }
    
    toggleSidebar() {
        const isExpanded = this.sidebar.classList.toggle('expanded');
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.toggle('visible', isExpanded);
        }
        if (this.sidebarToggle) {
            this.sidebarToggle.classList.toggle('hidden', isExpanded);
        }
    }
    
    closeSidebar() {
        this.sidebar.classList.remove('expanded');
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.remove('visible');
        }
        if (this.sidebarToggle) {
            this.sidebarToggle.classList.remove('hidden');
        }
    }
    
    openSidebar() {
        this.sidebar.classList.add('expanded');
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.add('visible');
        }
        if (this.sidebarToggle) {
            this.sidebarToggle.classList.add('hidden');
        }
    }
    
    // Data loading methods - these will interface with existing dashboard.js functions
    loadDashboardData() {
        // Load all dashboard data using existing functions
        if (typeof loadDashboardData === 'function') {
            loadDashboardData();
        } else {
            // Fallback to individual loading functions
            if (typeof loadAccounts === 'function') loadAccounts();
            if (typeof loadTransactions === 'function') loadTransactions();
            if (typeof loadBills === 'function') loadBills();
            if (typeof loadCategories === 'function') loadCategories();
            if (typeof loadSavingsGoals === 'function') loadSavingsGoals();
        }
    }
    
    loadAccountsData() {
        if (typeof loadAccounts === 'function') loadAccounts();
        // Load detailed accounts data if account manager exists
        if (window.accountManager && typeof window.accountManager.loadAccountsData === 'function') {
            window.accountManager.loadAccountsData();
        }
    }
    
    loadTransactionsData() {
        if (typeof loadTransactions === 'function') loadTransactions();
        if (typeof loadTransactionCategories === 'function') loadTransactionCategories();
    }
    
    loadBillsData() {
        if (typeof loadBills === 'function') loadBills();
        if (typeof loadBillCategories === 'function') loadBillCategories();
    }
    
    loadCategoriesData() {
        if (typeof loadCategories === 'function') loadCategories();
    }
    
    loadSavingsGoalsData() {
        if (typeof loadSavingsGoals === 'function') loadSavingsGoals();
    }
    
    loadAccountSettingsData() {
        // Load user profile data
        // This would typically fetch user info from the server
        console.log('Loading account settings...');
    }
    
    loadQuickStats() {
        // Load quick stats for dashboard
        fetch('/api/accounts')
            .then(response => response.json())
            .then(accounts => {
                const totalBalance = accounts.reduce((sum, acc) => {
                    if (acc.account_type === 'credit') {
                        return sum - acc.current_balance; // Subtract debt
                    }
                    return sum + acc.balance;
                }, 0);
                
                document.getElementById('totalBalance').textContent = `$${totalBalance.toFixed(2)}`;
                
                // Count active goals
                fetch('/api/savings-goals')
                    .then(response => response.json())
                    .then(goals => {
                        document.getElementById('activeGoals').textContent = goals.length;
                    })
                    .catch(error => console.error('Error loading goals:', error));
            })
            .catch(error => console.error('Error loading accounts:', error));
        
        // Load monthly stats
        fetch('/api/transactions')
            .then(response => response.json())
            .then(transactions => {
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                
                const monthlyTransactions = transactions.filter(t => {
                    const transDate = new Date(t.date);
                    return transDate.getMonth() === currentMonth && 
                           transDate.getFullYear() === currentYear;
                });
                
                const monthlyIncome = monthlyTransactions
                    .filter(t => t.transaction_type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                
                const monthlyExpenses = monthlyTransactions
                    .filter(t => t.transaction_type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                
                document.getElementById('monthlyIncome').textContent = `$${monthlyIncome.toFixed(2)}`;
                document.getElementById('monthlyExpenses').textContent = `$${monthlyExpenses.toFixed(2)}`;
            })
            .catch(error => console.error('Error loading transactions:', error));
    }
    
    loadRecentTransactions() {
        fetch('/api/transactions')
            .then(response => response.json())
            .then(transactions => {
                const recent = transactions.slice(0, 5); // Get 5 most recent
                const container = document.getElementById('recentTransactionsList');
                
                if (recent.length === 0) {
                    container.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; padding: 20px;">No transactions yet</p>';
                    return;
                }
                
                container.innerHTML = recent.map(transaction => `
                    <div class="transaction-item">
                        <div class="transaction-info">
                            <h4>${transaction.description}</h4>
                            <div class="transaction-meta">
                                ${transaction.category} • ${transaction.account_name} • ${new Date(transaction.date).toLocaleDateString()}
                            </div>
                        </div>
                        <div class="transaction-amount ${transaction.transaction_type}">
                            ${transaction.transaction_type === 'income' ? '+' : '-'}$${Math.abs(transaction.amount).toFixed(2)}
                        </div>
                    </div>
                `).join('');
            })
            .catch(error => console.error('Error loading recent transactions:', error));
    }
}

// Initialize sidebar navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarNav = new SidebarNavigation();
});